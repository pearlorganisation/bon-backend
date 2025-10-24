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
    if (req.body!== undefined  &&  req.body?.[field] !== undefined) {
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
