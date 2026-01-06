import jwt from "jsonwebtoken";
import Auth from "../models/auth/auth.model.js"; // your Auth model

const socketAuth = async (socket, next) => {
  try {
    // 1️⃣ Read token from handshake
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3️⃣ Get user
    const user = await Auth.findById(decoded._id).select("-password");

    if (!user) {
      return next(new Error("Invalid token"));
    }

    // 4️⃣ Optional: Sub-admin session check
    if (user.role === "SUB_ADMIN" && !user.refresh_token) {
      return next(new Error("Session expired. Please login again."));
    }

    // 5️⃣ Attach to socket
    socket.user = {
      id: user._id,
      name: user.name,
      role: user.role,
    };

    next(); // ✅ allow connection
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};

export default socketAuth;
