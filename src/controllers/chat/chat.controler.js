import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Conversation from "../../models/Chat/Conversation.model.js";
import Message from "../../models/Chat/Message.model.js";
import propertyModel from "../../models/Listing/property.model.js";

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
      .populate("propertyId", "title")
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
  const { message } = req.body;
  const userId = req.user.id;

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

export const deleteMessage = async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  const msg = await Message.findById(messageId);

  if (!msg) {
    return next(new CustomError("Message not found", 404));
  }

  if (msg.senderId.toString() !== userId) {
    return next(new CustomError("Not authorized to delete this message", 403));
  }

  const diffMinutes = (Date.now() - msg.createdAt.getTime()) / (1000 * 60);

  if (diffMinutes > DELETE_LIMIT_MINUTES) {
    return next(new CustomError("Delete time expired for this message", 400));
  }

  await msg.deleteOne();

  res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
};
