import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Conversation from "../../models/Chat/Conversation.model.js";
import Message from "../../models/Chat/Message.model.js";
import propertyModel from "../../models/Listing/property.model.js";
import { deleteFileFromCloudinary } from "../../utils/cloudinary.js";
import Auth from "../../models/auth/auth.model.js";

const EDIT_LIMIT_MINUTES = 5;
const DELETE_LIMIT_MINUTES = 5;

export const getOrCreateConversation = asyncHandler(async (req, res, next) => {
  const customerId = req.user._id;
  const { propertyId } = req.body;

  if (!propertyId) {
    return next(new CustomError("Property ID required", 400));
  }

  const property = await propertyModel.findById(propertyId).select("partnerId");

  if (!property) {
    return next(new CustomError("Property not found", 404));
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

export const getOrCreateAdminConversation = asyncHandler(
  async (req, res, next) => {
    const senderId = req.user._id;
    const senderRole = req.user.role;
    let { receiverId } = req.body;

    if (!["ADMIN", "SUB_ADMIN"].includes(senderRole)) {
      return next(new CustomError("Access denied", 403));
    }

    if (!receiverId && senderRole === "SUB_ADMIN") {
      const admin = await Auth.findOne({ role: "ADMIN" });
      if (!admin) return next(new CustomError("Admin not found", 404));
      receiverId = admin._id;
    }

    if (!receiverId) return next(new CustomError("Receiver ID required", 400));

    let conversation = await Conversation.findOne({
      isAdminChat: true,
      $or: [
        { customerId: senderId, partnerId: receiverId },
        { customerId: receiverId, partnerId: senderId },
      ],
    });

    if (!conversation) {
      conversation = await Conversation.create({
        isAdminChat: true,
        customerId: senderId,
        partnerId: receiverId,
      });
    }

    res.status(200).json({ success: true, conversationId: conversation._id });
  },
);

export const sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId, text, attachments } = req.body;
  const senderId = req.user._id;
  const senderRole = req.user.role;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation)
    return next(new CustomError("Conversation not found", 404));

  const message = await Message.create({
    conversationId,
    senderId,
    senderRole,
    text,
    attachments,
  });

  conversation.lastMessage = text || "Attachment sent";
  conversation.lastMessageAt = Date.now();

  if (conversation.customerId.toString() === senderId.toString()) {
    conversation.unreadCountPartner += 1;
  } else {
    conversation.unreadCountCustomer += 1;
  }

  await conversation.save();

  res.status(201).json({ success: true, data: message });
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
    conversation.customerId?.toString() === userId.toString() ||
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

export const getAdminConversationList = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    isAdminChat: true,
    $or: [{ customerId: userId }, { partnerId: userId }],
  })
    .populate("customerId", "name email profileImage role")
    .populate("partnerId", "name email profileImage role")
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: conversations.length,
    conversations: conversations.map((c) => {
      const otherUser =
        c.customerId._id.toString() === userId.toString()
          ? c.partnerId
          : c.customerId;
      return {
        conversationId: c._id,
        chatWith: otherUser,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount:
          c.customerId._id.toString() === userId.toString()
            ? c.unreadCountCustomer
            : c.unreadCountPartner,
      };
    }),
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
  },
);

export const updateMessage = async (req, res, next) => {
  const { messageId } = req.params;
  const { message } = req.body;
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
        new CustomError("Not authorized to delete this message", 403),
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
        resource_type === "image" ? "image" : "raw",
      );

      //  Remove attachment from message document
      message.attachments = message.attachments.filter(
        (a) => a.public_id !== publicId,
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
  },
);
