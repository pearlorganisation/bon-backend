import Conversation from "../models/Chat/Conversation.model.js";
import Message from "../models/Chat/Message.model.js";
import sendFirebaseNotification from "../utils/sendFirebaseNotification.js";
import onlineUsers from "./onlineUsers.js";

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
      const { conversationId, text, attachments = [] } = data;

      if (!conversationId) return;
      if (!text && attachments.length === 0) return;

      // Validate attachments
      for (const a of attachments) {
        if (!["image", "file"].includes(a.type)) return;
        if (!a.url) return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Assign partner if missing
      if (!conversation.partnerId && socket.user.role === "PARTNER") {
        conversation.partnerId = socket.user.id;
        await conversation.save();
      }

      // Authorization
      const userId = socket.user.id.toString();
      const isCustomer = conversation.customerId?.toString() === userId;
      const isPartner = conversation.partnerId?.toString() === userId;
      if (!isCustomer && !isPartner) return;

      const senderRole = isCustomer ? "CUSTOMER" : "PARTNER";

      // Save message
      const newMessage = await Message.create({
        conversationId,
        senderId: socket.user.id,
        senderRole,
        text,
        attachments,
        seenBy: [],
      });

      // Last message preview
      let lastMessagePreview = text;
      if (!text && attachments.length) {
        lastMessagePreview =
          attachments[0].type === "image" ? "📷 Image" : "📎 File";
      }

      conversation.lastMessage = lastMessagePreview;
      conversation.lastMessageAt = new Date();

      if (senderRole === "CUSTOMER") {
        conversation.unreadCountPartner += 1;
      } else {
        conversation.unreadCountCustomer += 1;
      }

      await conversation.save();

      // Emit message
      socket.to(conversationId).emit("receive_message", newMessage);

      // When sender receives "message_delivered"
      socket.to("message_delivered", ({ messageId }) => {
        // mark the specific message as delivered (double gray tick)
        updateMessageTick(messageId, "delivered");
      });

      // 🔔 Firebase notification (receiver offline)
      const receiverId =
        senderRole === "CUSTOMER"
          ? conversation.partnerId
          : conversation.customerId;

      if (receiverId && !onlineUsers.has(receiverId.toString())) {
        const receiver = await User.findById(receiverId);

        let notificationBody = text?.substring(0, 40);
        if (!text && attachments.length) {
          notificationBody =
            attachments[0].type === "image"
              ? "📷 Image received"
              : "📎 File received";
        }

        for (const t of receiver.fcmTokens) {
          await sendFirebaseNotification({
            token: t.token,
            title: "New Message",
            body: notificationBody,
            data: { conversationId },
          });
        }
      }
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
