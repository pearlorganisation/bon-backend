import Conversation from "../models/Chat/Conversation.model.js";
import Message from "../models/Chat/Message.model.js";
// import sendFirebaseNotification from "../utils/firebase.js"; // optional

const registerChatHandlers = (io, socket) => {
  /**
   * Join conversation room
   */

  socket.on("join_conversation", async ({ conversationId }) => {
    if (!conversationId) return;

    console.log("join conversation ");

    socket.join(conversationId);
  });

  /**
   * Send message
   */

  socket.on("send_message", async (data) => {
    try {
      const { conversationId, message } = data;

      console.log("data ", data);

      if (!conversationId || !message) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // After fetching conversation
      if (!conversation.partnerId && socket.user.role === "PARTNER") {
        conversation.partnerId = socket.user.id;
      }

      console.log("conversaton ", conversation);

      // Authorization check
      const userId = socket.user.id.toString();
      const isCustomer = conversation.customerId?.toString() === userId;
      const isPartner = conversation.partnerId?.toString() === userId;

      if (!isCustomer && !isPartner) {
        return;
      }

      const senderRole = isCustomer ? "CUSTOMER" : "PARTNER";

      // Save message
      const newMessage = await Message.create({
        conversationId,
        senderId: socket.user.id,
        senderRole,
        message,
        seenBy: [], // nobody has seen it yet
      });

      // Update conversation metadata
      conversation.lastMessage = message;
      conversation.lastMessageAt = new Date();

      if (senderRole === "CUSTOMER") {
        conversation.unreadCountPartner += 1;
      } else {
        conversation.unreadCountCustomer += 1;
      }
      console.log("created conversation ", conversation);
      await conversation.save();

      // Emit message to conversation room
      socket.to(conversationId).emit("receive_message", {
        _id: newMessage._id,
        conversationId,
        senderId: socket.user.id,
        senderRole,
        message,
        createdAt: newMessage.createdAt,
      });

      // Optional: Firebase notification if receiver offline
      // sendFirebaseNotification(...)
    } catch (error) {
      console.error("send_message error:", error);
    }
  });

  /**
   * Mark messages as read
   */



  socket.on("message_seen", async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Mark messages as seen by this user
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: socket.user.id }, // only other user's messages
          seenBy: { $ne: socket.user.id },
        },
        {
          $push: { seenBy: socket.user.id },
        }
      );

      // Reset unread count
      if (socket.user.role === "CUSTOMER") {
        conversation.unreadCountCustomer = 0;
      } else {
        conversation.unreadCountPartner = 0;
      }
      await conversation.save();

      // Find other user
      const otherUserId =
        socket.user.role === "CUSTOMER"
          ? conversation.partnerId
          : conversation.customerId;

      // Notify other user in real time
      if (otherUserId) {
        io.to(otherUserId.toString()).emit("message_seen_by_user", {
          conversationId,
          seenBy: socket.user.id,
        });
      }
    } catch (error) {
      console.error("message_seen error:", error);
    }
  });
};

export default registerChatHandlers;
