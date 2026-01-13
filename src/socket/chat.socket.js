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
      const { conversationId, text, attachments = [] } = data;

      if (!conversationId) return;
      if (!text && attachments.length === 0) return;

      // Validate attachments
      if (attachments.length > 0) {
        for (const a of attachments) {
          if (!["image", "file"].includes(a.type)) return;
          if (!a.url) return;
        }
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Assign partner if missing
      if (!conversation.partnerId && socket.user.role === "PARTNER") {
        conversation.partnerId = socket.user.id;
      }

      // Authorization
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
        text,
        attachments,
        seenBy: [],
      });

      if (senderRole === "CUSTOMER") {
        conversation.unreadCountPartner += 1;
      } else {
        conversation.unreadCountCustomer += 1;
      }

      socket.to(conversationId).emit("receive_message", newMessage);

      await conversation.save();

      // Last message preview
      let lastMessagePreview = text;
      if (!text && attachments.length) {
        lastMessagePreview =
          attachments[0].type === "image" ? "📷 Image" : "📎 File";
      }

      conversation.lastMessage = lastMessagePreview;
      conversation.lastMessageAt = new Date();

     

      // 🔔 Firebase notification (receiver offline)
      const receiverId =
        senderRole === "CUSTOMER"
          ? conversation.partnerId
          : conversation.customerId;

      if (receiverId && !onlineUsers.has(receiverId.toString())) {
        const receiver = await User.findById(receiverId);

        let notificationBody = text?.substring(0, 40);

        if (!text && attachments.length) {
          const imageCount = attachments.filter(
            (a) => a.type === "image"
          ).length;
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
