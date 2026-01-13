import Conversation from "../models/Chat/Conversation.model.js";
import Message from "../models/Chat/Message.model.js";
import User from "../models/auth/auth.model.js";
import sendFirebaseNotification from "../utils/sendFirebaseNotification.js";
import onlineUsers from "./onlineUsers.js";

const registerChatHandlers = (io, socket) => {
  // 1. Join a private room named after the User's ID
  // This allows us to send messages to this specific user regardless of which chat they are in
  const authenticatedUserId = socket.user.id.toString();
  socket.join(authenticatedUserId);
  console.log(
    `User ${authenticatedUserId} joined their private notification room`
  );

  /**
   * Join specific conversation room
   */
  socket.on("join_conversation", async ({ conversationId }) => {
    if (!conversationId) return;
    console.log("User joined conversation room:", conversationId);
    socket.join(conversationId);
  });

  /**
   * Send message logic
   */
  socket.on("send_message", async (data) => {
    try {
      const { conversationId, message } = data;
      if (!conversationId || !message) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Auto-assign partner if not present
      if (!conversation.partnerId && socket.user.role === "PARTNER") {
        conversation.partnerId = socket.user.id;
      }

      const userId = socket.user.id.toString();
      const isCustomer = conversation.customerId?.toString() === userId;
      const isPartner = conversation.partnerId?.toString() === userId;

      if (!isCustomer && !isPartner) return;

      const senderRole = isCustomer ? "CUSTOMER" : "PARTNER";

      // Save message to DB
      const newMessage = await Message.create({
        conversationId,
        senderId: socket.user.id,
        senderRole,
        message,
        seenBy: [socket.user.id], // Sender has obviously seen it
      });

      // Update conversation metadata
      conversation.lastMessage = message;
      conversation.lastMessageAt = new Date();
      if (senderRole === "CUSTOMER") {
        conversation.unreadCountPartner += 1;
      } else {
        conversation.unreadCountCustomer += 1;
      }
      await conversation.save();

      const messagePayload = {
        _id: newMessage._id,
        conversationId,
        senderId: socket.user.id,
        senderRole,
        message,
        createdAt: newMessage.createdAt,
      };

      // 2. EMIT TO CONVERSATION ROOM (For the active chat window)
      io.to(conversationId).emit("receive_message", messagePayload);

      // 3. EMIT TO RECEIVER'S PRIVATE ROOM (For the Dashboard/Chat List update)
      const receiverId = isCustomer
        ? conversation.partnerId
        : conversation.customerId;

      if (receiverId) {
        // This event name 'update_chat_list' should be listened to on your Sidebar/Dashboard
        io.to(receiverId.toString()).emit("update_chat_list", {
          ...messagePayload,
          unreadCount:
            senderRole === "CUSTOMER"
              ? conversation.unreadCountPartner
              : conversation.unreadCountCustomer,
        });

        // 🔔 FIREBASE NOTIFICATION IF RECEIVER OFFLINE
        const isReceiverOnline = onlineUsers.has(receiverId.toString());
        if (!isReceiverOnline) {
          const receiver = await User.findById(receiverId);
          if (receiver?.fcmTokens) {
            for (const t of receiver.fcmTokens) {
              await sendFirebaseNotification({
                token: t.token,
                title: "New Message",
                body: message,
                data: { conversationId: conversationId.toString() },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("send_message error:", error);
    }
  });

  socket.on("message_seen", async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: socket.user.id },
          seenBy: { $ne: socket.user.id },
        },
        { $push: { seenBy: socket.user.id } }
      );

      if (socket.user.role === "CUSTOMER") {
        conversation.unreadCountCustomer = 0;
      } else {
        conversation.unreadCountPartner = 0;
      }
      await conversation.save();

      const otherUserId =
        socket.user.role === "CUSTOMER"
          ? conversation.partnerId
          : conversation.customerId;
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
