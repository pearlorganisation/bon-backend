import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Conversation from "../../models/Chat/Conversation.model.js";
import Message from "../../models/Chat/Message.model.js";

/**
 * Get or create conversation and fetch messages
 * - Customer clicks chat on property page
 * - Partner clicks on a customer in inbox
 */
export const getConversationMessages = asyncHandler(async (req, res, next) => {

  const userId = req.user._id.toString();

  const { propertyId, customerId, conversationId } = req.query; // query params

  let conversation;

  //  If conversationId provided (for partner selecting customer)
  if (conversationId) {
    conversation = await Conversation.findById(conversationId);

    if (!conversation)
      return next(new CustomError("Conversation not found", 404));
  } else {
    
    //  If customer clicked chat button
    if (!propertyId) return next(new CustomError("Property ID required", 400));
    const targetCustomerId = customerId || userId; // for partner fetching for a customer

    // Find existing conversation
    conversation = await Conversation.findOne({
      propertyId,
      customerId: targetCustomerId,
    });

    // Create new conversation if not exists
    if (!conversation) {
      conversation = await Conversation.create({
        propertyId,
        customerId: targetCustomerId,
        partnerId: null, // can fill if known
      });
    }
  }

  // 3️⃣ Authorization check
  const isCustomer = conversation.customerId.toString() === userId;
  const isPartner = conversation.partnerId?.toString() === userId;

  if (!isCustomer && !isPartner) {
    return next(new CustomError("Not authorized", 403));
  }

  // 4️⃣ Fetch messages
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    conversation: {
      _id: conversation._id,
      customerId: conversation.customerId,
      partnerId: conversation.partnerId,
      propertyId: conversation.propertyId,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCountCustomer: conversation.unreadCountCustomer,
      unreadCountPartner: conversation.unreadCountPartner,
    },
    messages,
  });
});

export const getConversationList = asyncHandler(async (req, res, next) => {
  const userId = req.user._id.toString();
  const role = req.user.role;

  if (role !== "PARTNER") {
    return next(new CustomError("Only Partner allowed", 403));
  }

  const conversations = await Conversation.find({ partnerId: userId, role })
    .sort({ lastMessageAt: -1 }) // recent first
    .lean();

  res.status(200).json({ success: true, conversations });
});
