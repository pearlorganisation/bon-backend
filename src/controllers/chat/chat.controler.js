import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Conversation from "../../models/Chat/Conversation.model.js";
import Message from "../../models/Chat/Message.model.js";
import propertyModel from "../../models/Listing/property.model.js";
import { deleteFileFromCloudinary } from "../../utils/cloudinary.js";
import { uploadFileToCloudinary } from "../../utils/cloudinary.js";
import onlineUsers from "../../socket/onlineUsers.js";
import sendFirebaseNotification from "../../utils/sendFirebaseNotification.js";

const EDIT_LIMIT_MINUTES = 5;
const DELETE_LIMIT_MINUTES = 5;

export const getOrCreateConversation = asyncHandler(async (req, res, next) => {
  const customerId = req.user._id;
  const { propertyId } = req.body;

  if (!propertyId) {
    return next(new CustomError("Property ID required", 400));
  }

  const property = await propertyModel.findById(propertyId).select("partnerId");

  if (!property || property.partnerId == null) {
    return next(new CustomError("Property not found or not yet listed", 404));
  }

  let conversation = await Conversation.findOne({
    propertyId,
    customerId,
    partnerId: property.partnerId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      propertyId,
      customerId,
      partnerId: property.partnerId,
    });
  }

  res.status(200).json({
    success: true,
    conversationId: conversation._id,
  });
});

export const getConversationMessages = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.query;

  if (!conversationId) {
    return next(new CustomError("Conversation ID required", 400));
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return next(new CustomError("Conversation not found", 404));
  }

  const isAuthorized =
    conversation.customerId.toString() === userId.toString() ||
    conversation.partnerId?.toString() === userId.toString();

  if (!isAuthorized) {
    return next(new CustomError("Not authorized", 403));
  }

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    conversationId,
    messages,
  });
});

export const getPartnerConversationList = asyncHandler(
  async (req, res, next) => {
    if (req.user.role !== "PARTNER") {
      return next(new CustomError("Only Partner allowed", 403));
    }

    const partnerId = req.user._id;

    const conversations = await Conversation.find({ partnerId })
      .populate("customerId", "name email")
      .populate("propertyId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations: conversations.map((c) => ({
        conversationId: c._id,
        customer: c.customerId,
        property: c.propertyId,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.unreadCountPartner,
      })),
    });
  }
);

export const updateMessage = async (req, res, next) => {

  const { messageId } = req.params;

  const { message, publicId, resource_type } = req.body;

  const userId = req.user._id;

  const msg = await Message.findById(messageId);

  if (!msg) {
    return next(new CustomError("Message not found", 404));
  }

  // Only sender can edit
  if (msg.senderId.toString() !== userId) {
    return next(new CustomError("Not authorized to edit this message", 403));
  }

  // Time limit check
  const diffMinutes = (Date.now() - msg.createdAt.getTime()) / (1000 * 60);

  if (diffMinutes > EDIT_LIMIT_MINUTES) {
    return next(new CustomError("Edit time expired for this message", 400));
  }

  if (publicId && resource_type) {
    await deleteFileFromCloudinary(
      publicId,
      resource_type === "image" ? "image" : "raw"
    );

    //  Remove attachment from message document
    msg.attachments = msg.attachments.filter(
      (a) => a.public_id !== publicId
    );

    if (!msg.text && msg.attachments.length === 0) {
      await msg.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Attachment deleted and message removed",
      });
    }
  }

  msg.message = message;
  await msg.save();

  res.status(200).json({
    success: true,
    message: "Message updated successfully",
    data: msg,
  });
};

export const deleteMessageAttachment = async (req, res, next) => {
  try {
    const { messageId, publicId, resource_type } = req.body;
    const userId = req.user._id;

    if (!messageId) {
      return next(new CustomError("Message is required", 400));
    }

    //  Find message
    const message = await Message.findById(messageId);

    if (!message) {
      return next(new CustomError("Message not found", 404));
    }

    //  Authorization check (only sender can delete)
    if (message.senderId.toString() !== userId) {
      return next(
        new CustomError("Not authorized to delete this message", 403)
      );
    }

    const diffMinutes =
      (Date.now() - message.createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > DELETE_LIMIT_MINUTES) {
      return next(new CustomError("Delete time expired for this message", 400));
    }

    await message.deleteOne();

    if (publicId && resource_type) {
      await deleteFileFromCloudinary(
        publicId,
        resource_type === "image" ? "image" : "raw"
      );

      //  Remove attachment from message document
      message.attachments = message.attachments.filter(
        (a) => a.public_id !== publicId
      );

      if (!message.text && message.attachments.length === 0) {
        await message.deleteOne();

        return res.status(200).json({
          success: true,
          message: "Attachment deleted and message removed",
        });
      }
    }
  } catch (error) {
    console.error("Delete attachment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCustomerConversationList = asyncHandler(
  async (req, res, next) => {
    const customerId = req.user._id;

    const conversations = await Conversation.find({ customerId })
      .populate("partnerId", "name email profileImage")
      .populate("propertyId", "name images title")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations: conversations.map((c) => ({
        conversationId: c._id,
        partner: c.partnerId,
        property: c.propertyId,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.unreadCountCustomer,
      })),
    });
  }
);

export const sendMessageWithFiles = async (req, res, next) => {
  try {
    const { conversationId, text } = req.body;

    const files = req.files || [];

    if (!conversationId) {
      return next(new CustomError("conversationId is required", 400));
    }

    if (!text && files.length === 0) {
      return next(new CustomError("Message or files required", 400));
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return next(new CustomError("Conversation not found", 404));
    }

    const userId = req.user._id.toString();
    const isCustomer = conversation.customerId?.toString() === userId;
    const isPartner = conversation.partnerId?.toString() === userId;

    if (!isCustomer && !isPartner) {
      return next(new CustomError("Not authorized", 403));
    }

    const senderRole = isCustomer ? "CUSTOMER" : "PARTNER";

    let attachments = [];
    if (files.length > 0) {
      const uploadedFiles = await uploadFileToCloudinary(files, "chat_files");

      attachments = uploadedFiles.map((file) => ({
        url: file.secure_url,
        public_id: file.public_id,
        type: file.resource_type === "image" ? "image" : "file",
      }));
    }

    const message = await Message.create({
      conversationId,
      senderId: req.user.id,
      senderRole,
      text: text || "",
      attachments,
      seenBy: [],
    });

    if (senderRole === "CUSTOMER") {
      conversation.unreadCountPartner += 1;
    } else {
      conversation.unreadCountCustomer += 1;
    }

    let lastMessagePreview = text;
    if (!text && attachments.length) {
      lastMessagePreview =
        attachments[0].type === "image" ? "📷 Image" : "📎 File";
    }

    conversation.lastMessage = lastMessagePreview;
    conversation.lastMessageAt = new Date();

    await conversation.save();

    // Emit socket event
    const socketId = onlineUsers.get(userId);
    io.to(socketId).emit("receive_message", data);

    const receiverId =
      senderRole === "CUSTOMER"
        ? conversation.partnerId
        : conversation.customerId;

    if (receiverId && !onlineUsers.has(receiverId.toString())) {
      const receiver = await User.findById(receiverId);

      let notificationBody = text?.substring(0, 40);

      if (!text && attachments.length) {
        const imageCount = attachments.filter((a) => a.type === "image").length;
        const fileCount = attachments.filter((a) => a.type === "file").length;

        if (imageCount && fileCount) {
          notificationBody = `📎 ${attachments.length} attachments received`;
        } else if (imageCount > 1) {
          notificationBody = `📷 ${imageCount} images received`;
        } else if (imageCount === 1) {
          notificationBody = "📷 Image received";
        } else if (fileCount > 1) {
          notificationBody = `📄 ${fileCount} files received`;
        } else if (fileCount === 1) {
          notificationBody = "📄 File received";
        }
      }

      await sendFirebaseNotification({
        token: receiver.fcmToken,
        title: "New Message",
        body: notificationBody,
        data: { conversationId },
      });
    }

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("sendMessageWithFiles error:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
};
