import { Server } from "socket.io";
import socketAuth from "./socketAuth.js";
import registerChatHandlers from "./chat.socket.js";
import onlineUsers from "./onlineUsers.js";

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // restrict in production
      methods: ["GET", "POST"],
    },
  });

  // Socket authentication middleware
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.user.id.toString();
    const role = socket.user.role;

    console.log(`Socket connected: ${socket.id}, User: ${userId}, Role: ${role}`);

    // Join personal room (for direct emits if needed)
    // socket.join(userId);

    // 1️⃣ Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Broadcast online status to all users
    io.emit("user_status", { userId, online: true, role });

    // Optional: partners can fetch all online customers
    socket.on("get_online_customers", () => {
      const onlineCustomers = [];
      for (let [id, sockets] of onlineUsers.entries()) {
        if (sockets.role === "CUSTOMER") onlineCustomers.push(id);
      }
      socket.emit("online_customers", onlineCustomers);
    });

    // Register chat-related events (send_message, mark_as_read, etc.)
    registerChatHandlers(io, socket);

    // Handle disconnect
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user_status", { userId, online: false, role });
        }
      }
      console.log(`Socket disconnected: ${socket.id}, User: ${userId}`);
    });
  });

  return io;
};

export default initSocket;
export { io };
