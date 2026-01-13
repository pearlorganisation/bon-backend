import jwt from "jsonwebtoken";
import cookie from "cookie";
import Auth from "../models/auth/auth.model.js";

const socketAuth = async (socket, next) => {
  
  try {

    //  Parse cookies from handshake
    const cookies = socket.handshake.headers.cookie
      ? cookie.parse(socket.handshake.headers.cookie)
      : {};

    //  Get access token
    const token =
      cookies.accessToken || // 👈 cookie-based auth (BEST)
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    //  Verify JWT
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //  Fetch user
    const user = await Auth.findById(decoded._id).select("-password");

    if (!user) {
      return next(new Error("Invalid token"));
    }

    //  Attach user to socket
    socket.user = {
      id: user._id,
      name: user.name,
      role: user.role,
    };

    next(); //  allow socket connection
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};

export default socketAuth;
