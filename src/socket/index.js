import { Server } from "socket.io";
import socketAuth from "./socketAuth.js";
import registerChatHandlers from "./chat.socket.js";
import onlineUsers from "./onlineUsers.js";
import ConversationModel from "../models/Chat/Conversation.model.js";

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // restrict in production
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket connection initialized");

  // Socket authentication middleware
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.user.id.toString();
    const role = socket.user.role;

    console.log(
      `Socket connected: ${socket.id}, User: ${userId}, Role: ${role}`
    );

    // onlineUsers: Map<userId, socketId>
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    console.log(`Socket connected: ${socket.id}, User: ${userId}`);
    console.log("Online users map count:", onlineUsers.size);

    // 2️⃣ Notify counterparts and get their current status
    const notifyCounterparts = async () => {
      const conversations =
        role === "CUSTOMER"
          ? await ConversationModel.find({ customerId: userId }).lean()
          : await ConversationModel.find({ partnerId: userId }).lean();

      for (const conv of conversations) {
        const counterpartId =
          role === "CUSTOMER"
            ? conv.partnerId?.toString()
            : conv.customerId?.toString();
        if (!counterpartId) continue;

        //  2a. Send current counterpart status to this user
        const isCounterpartOnline = onlineUsers.has(counterpartId);
        socket.emit("user_status", {
          userId: counterpartId,
          online: isCounterpartOnline,
        });

        //  2b. Notify counterpart that this user is online
        if (onlineUsers.has(counterpartId)) {
          onlineUsers.get(counterpartId).forEach((socketId) => {
            io.to(socketId).emit("user_status", { userId, online: true });
          });
        }
      }
    };

    await notifyCounterparts();

    // 3️⃣ Register chat events
    registerChatHandlers(io, socket);

    // 4️⃣ Handle disconnect
    socket.on("disconnect", async () => {
      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        // Remove only this specific socket ID
        userSockets.delete(socket.id);

        // Only if ALL tabs/devices are closed, mark user as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          const conversations =
            role === "CUSTOMER"
              ? await ConversationModel.find({ customerId: userId }).lean()
              : await ConversationModel.find({ partnerId: userId }).lean();

          for (const conv of conversations) {
            const counterpartId =
              role === "CUSTOMER"
                ? conv.partnerId?.toString()
                : conv.customerId?.toString();
            if (counterpartId && onlineUsers.has(counterpartId)) {
              onlineUsers.get(counterpartId).forEach((socketId) => {
                io.to(socketId).emit("user_status", { userId, online: false });
              });
            }
          }
        }
      }
    });
  });

  return io;
};

export default initSocket;
export { io };
