import successResponse from "../utils/error/successResponse.js";
import CustomError from "../utils/error/customError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import Auth from "../models/auth/auth.model.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../utils/cloudinary.js";

export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const user = await Auth.findById(req.user._id);

  if (!user) {
    return next(new CustomError("User not found ", 404));
  }

  const updatableFields = [
    "name",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "gender",
    "dateOfBirth",
    "phoneNumber",
  ];

  updatableFields.forEach((field) => {
    if (req.body !== undefined && req.body?.[field] !== undefined) {
      user[field] = req.body[field].trim().toLowerCase();
    }
  });

  if (req.files) {
    const image = await uploadFileToCloudinary(req.files, "Users/images");

    if (user.profileImageUrl?.public_id) {
      await deleteFileFromCloudinary(user.profileImageUrl.public_id);
    }
    console.log(image);
    user.profileImageUrl = image[0];
  }

  await user.save();

  successResponse(res, 200, "profile updated successfully");
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await Auth.findById(req.user._id).select(
    "-password -refresh_token"
  );

  if (!user) {
    return next(new CustomError("User not found ", 404));
  }

  successResponse(res, 200, "User profile fetched successfully", user);
});

export const getAllUsers = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return next(new CustomError("Not authorized to access this route", 403));
  }

  const users = await Auth.find().select("-password -refresh_token");

  if (!users || users.length === 0) {
    return next(new CustomError("No users found", 404));
  }

  successResponse(res, 200, "All users fetched successfully", users);
});

export const getUserProfileById = asyncHandler(async (req, res, next) => {
  const adminRole = req.user.role;

  if (adminRole !== "ADMIN") {
    return next(new CustomError("Not authorized to access this route", 403));
  }

  const userId = req.params.userId;

  const user = await Auth.findById(userId).select("-password -refresh_token");

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  successResponse(res, 200, "User profile fetched successfully", user);
});

export const createUserByAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, phoneNumber, password, role } = req.body;

  if (!name || !email || !phoneNumber || !password || !role) {
    return next(new CustomError("All fields are required", 400));
  }

  const existingUser = await Auth.findOne({ email });
  if (existingUser) {
    return next(new CustomError("User with this email already exists", 400));
  }

  const newUser = await Auth.create({
    name,
    email,
    phoneNumber,
    password,
    role,
    isVerified: true,
  });

  if (role === "PARTNER") {
    await Partner.create({ userId: newUser._id });
  } else if (role === "CUSTOMER") {
    await Customer.create({ userId: newUser._id });
  }
  // Note: SUB_ADMIN and ADMIN might not have separate profile models in your current setup

  return successResponse(
    res,
    201,
    "User created successfully by Admin",
    newUser
  );
});

// updating all user details for admin

export const updateAllUsers = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  let user = await Auth.findById(userId);

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  const updatableFields = [
    "name",
    "email",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "gender",
    "dateOfBirth",
    "phoneNumber",
    "role", // Admin can also update role
    "isVerified", // Admin can verify user
  ];

  updatableFields.forEach((field) => {
    if (req.body && req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // If admin uploads profile image
  if (req.files) {
    const image = await uploadFileToCloudinary(req.files, "Users/images");

    if (user.profileImageUrl?.public_id) {
      await deleteFileFromCloudinary(user.profileImageUrl.public_id);
    }

    user.profileImageUrl = image[0];
  }

  await user.save();

  successResponse(res, 200, "User updated successfully", user);
});

export const deleteAllUsers = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const user = await Auth.findById(userId);

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  // Delete profile image from cloudinary
  if (user.profileImageUrl?.public_id) {
    await deleteFileFromCloudinary(user.profileImageUrl.public_id);
  }

  await user.deleteOne();

  successResponse(res, 200, "User deleted successfully");
});
