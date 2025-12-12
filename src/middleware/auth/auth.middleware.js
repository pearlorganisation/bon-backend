import jwt from "jsonwebtoken";
import asyncHandler from "../asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Auth from "../../models/auth/auth.model.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1️⃣ Read token from cookies
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new CustomError("Not authorized, token missing", 401));
  }

  try {
    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // const decoded_refresh = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await Auth.findById(decoded._id).select(
      "-password -refresh_token"
    );
    if (!user) {
      return next(new CustomError("Invalid access token!", 401));
    }
    req.user = user;
    next();
  } catch (error) {
    return next(
      new CustomError("Not authorized, token invalid or expired", 401)
    );
  }
});

// Middleware factory to check allowed roles
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(new CustomError("User role not found", 401));
    }

    if (!allowedRoles.includes(userRole)) {
      return next(
        new CustomError(
          `Role (${req.user.role}) is not allowed to access this resource`,
          403
        )
      );
    }

    next(); // role is allowed, proceed
  };
};


export const isAdmin = authorizeRoles("ADMIN");