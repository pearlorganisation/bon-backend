import successResponse from "../utils/error/successResponse.js";
import CustomError from "../utils/error/customError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import Auth from "../models/auth/auth.model.js";
import Property from "../models/Listing/property.model.js";
import Room from "../models/Listing/room.model.js";
import RoomInventory from "../models/Listing/roomInventory.model.js";
import {getDatesBetween,isRoomBlocked,normalizeDate} from "../controllers/Booking/booking.controller.js"

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


//search

export const searchProperties = asyncHandler(async (req, res, next) => {
  const {
    location,
    checkIn,
    checkOut,
    rooms = 1,
    propertyType,
  } = req.query;

  if (!location || !checkIn || !checkOut) {
    return next(
      new CustomError("Location, check-in and check-out are required", 400)
    );
  }
  const checkInDate = normalizeDate(checkIn);
  const checkOutDate = normalizeDate(checkOut);
  if (checkInDate >= checkOutDate) {
    return next(new CustomError("Invalid date range", 400));
  }

  const dates = getDatesBetween(checkInDate, checkOutDate);
 console.log("dates",dates);
  // 1️ Find properties
  const propertyQuery = {
    status: "active",
    verified: "approved",
    $or: [
      { city: new RegExp(location, "i") },
      { state: new RegExp(location, "i") },
      { country: new RegExp(location, "i") },
    ],
  };

  if (propertyType) propertyQuery.propertyType = propertyType;

  const properties = await Property.find(propertyQuery).lean();
  if (!properties.length) {
    return successResponse(res, 200, "No properties found", []);
  }

  const propertyIds = properties.map((p) => p._id);

  // 2️ Get rooms
  const roomsList = await Room.find({
    propertyId: { $in: propertyIds },
  }).lean();

  if (!roomsList.length) {
    return successResponse(res, 200, "No rooms found", []);
  }

  const roomIds = roomsList.map((r) => r._id);

  // 3️ Get inventories for date range
  const inventories = await RoomInventory.find({
    roomId: { $in: roomIds },
    date: { $in: dates },
  }).lean();

  // 4️ Build inventory map → roomId → date → booked
  const inventoryMap = {};
  for (const inv of inventories) {
    const roomKey = inv.roomId.toString();
    if (!inventoryMap[roomKey]) inventoryMap[roomKey] = {};
    inventoryMap[roomKey][inv.date.toISOString()] = inv.bookedRooms;
  }

  // 5️ Filter rooms
  const propertyRoomMap = {};

  for (const room of roomsList) {
    // ❌ Blocked dates check
    if (isRoomBlocked(room, checkInDate, checkOutDate)) continue;

    let maxBooked = 0;

    for (const date of dates) {
      const booked =
        inventoryMap[room._id.toString()]?.[date.toISOString()] || 0;
      maxBooked = Math.max(maxBooked, booked);
      console.log(maxBooked, date.toISOString());
    }

    const availableRooms = room.numberOfRooms - maxBooked;
   /// console.log(availableRooms);
    if (availableRooms < rooms) continue;

    if (!propertyRoomMap[room.propertyId]) {
      propertyRoomMap[room.propertyId] = [];
    }

    propertyRoomMap[room.propertyId].push({
      ...room,
      availableRooms,
    });
  }        

  // 6️ Final response
  const result = properties
    .filter((p) => propertyRoomMap[p._id])
    .map((p) => ({
      ...p,
      rooms: propertyRoomMap[p._id],
    }));

  successResponse(res, 200, "Search results fetched", {
    totalProperties: result.length,
    data: result,
  });
});
