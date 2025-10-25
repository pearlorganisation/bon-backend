import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../utils/cloudinary.js";
import Room from "../../models/Listing/room.model.js";

export const createRooms = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;

  let {
    numberOfRooms,
    name,
    capacity,
    pricePerNight,
    type,
    amenities,
    bedType,
    bedCount,
    blockedDates,
  } = req.body;

  // ✅ Validate required fields
  if (!numberOfRooms || numberOfRooms < 1) {
    return next(new CustomError("numberOfRooms must be at least 1", 400));
  }

  if (!name || !pricePerNight || !type || !bedType) {
    return next(
      new CustomError(
        "Name, pricePerNight, type, and bedType are required",
        400
      )
    );
  }

  // ✅ Convert fields to correct format
  numberOfRooms = parseInt(numberOfRooms);
  const baseRoomData = {
    propertyId,
    name: name.trim().toLowerCase(),
    capacity: capacity || 2,
    pricePerNight,
    type: type.toLowerCase(),
    amenities: amenities ? amenities.map((item) => item.toLowerCase()) : [],
    bedType: bedType.toLowerCase(),
    bedCount: bedCount || 1,
    blockedDates: blockedDates || [],
  };

  // ✅ Validate ENUM fields
  const validTypes = [
    "single",
    "double",
    "deluxe",
    "suite",
    "triple",
    "family",
  ];
  const validBeds = ["single", "double", "queen", "king", "twin", "sofa-bed"];

  if (!validTypes.includes(baseRoomData.type)) {
    return next(
      new CustomError(
        `Invalid room type. Allowed: ${validTypes.join(", ")}`,
        400
      )
    );
  }
  if (!validBeds.includes(baseRoomData.bedType)) {
    return next(
      new CustomError(`Invalid bed type. Allowed: ${validBeds.join(", ")}`, 400)
    );
  }

  // ✅ Create multiple rooms
  const roomsToCreate = [];
  for (let i = 0; i < numberOfRooms; i++) {
    roomsToCreate.push({ ...baseRoomData });
  }

  const createdRooms = await Room.insertMany(roomsToCreate);

  return successResponse(
    res,
    201,
    `${numberOfRooms} rooms created successfully`,
    createdRooms
  );
});

export const updateRoomById = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id; // from auth middleware
  const roomId = req.params.roomId;

  // ✅ Find Room First (and ensure it belongs to the partner's property)
  const room = await Room.findById(roomId).populate("propertyId");

  if (!room) {
    return next(new CustomError("Room not found", 404));
  }

  // ✅ Allow only the partner who owns the property to update
  if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
    return next(
      new CustomError("You are not authorized to update this room", 403)
    );
  }

  // ✅ Extract updatable fields from body
  const {
    name,
    capacity,
    pricePerNight,
    type,
    amenities,
    bedType,
    bedCount,
    blockedDates,
  } = req.body;

  // ✅ Apply updates if provided
  if (name) room.name = name.trim().toLowerCase();
  if (description) room.description = description.trim().toLowerCase();
  if (capacity) room.capacity = capacity;
  if (pricePerNight) room.pricePerNight = pricePerNight;
  if (type) room.type = type.toLowerCase();
  if (amenities) room.amenities = amenities.map((a) => a.toLowerCase());
  if (bedType) room.bedType = bedType.toLowerCase();
  if (bedCount) room.bedCount = bedCount;
  if (blockedDates) room.blockedDates = blockedDates;

  // ✅ Validate ENUM fields
  const validTypes = [
    "single",
    "double",
    "deluxe",
    "suite",
    "triple",
    "family",
  ];
  const validBeds = ["single", "double", "queen", "king", "twin", "sofa-bed"];

  if (type && !validTypes.includes(room.type)) {
    return next(
      new CustomError(
        `Invalid room type. Allowed: ${validTypes.join(", ")}`,
        400
      )
    );
  }
  if (bedType && !validBeds.includes(room.bedType)) {
    return next(
      new CustomError(`Invalid bed type. Allowed: ${validBeds.join(", ")}`, 400)
    );
  }

  // ✅ Save in DB
  await room.save();

  return successResponse(res, 200, "Room updated successfully", room);
});

export const updateRoomsInBulk = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertId;
  let { types, pricePerNight, blockedDate, amenities, capacity } = req.body;

  if (!types || types.length === 0) {
    return next(new CustomError("Room types are required", 400));
  }

  // ✅ Validate blockedDate
  if (blockedDate && isNaN(Date.parse(blockedDate))) {
    return next(new CustomError("Invalid blocked date format", 400));
  }

  // ✅ Find all rooms of this partner matching the types
  const rooms = await Room.find({
    propertyId,
    type: { $in: types.map((t) => t.toLowerCase()) },
  });
          

  if (!rooms.length) {
    return next(new CustomError("No rooms found for provided types", 404));
  }

  // ✅ Perform bulk update
  const updateFields = {};
  if (pricePerNight) updateFields.pricePerNight = pricePerNight;
  if (amenities) updateFields.amenities = amenities.map((a) => a.toLowerCase());
  if (capacity) updateFields.capacity = capacity;

  // ✅ Update static fields (same for all rooms)
  await Room.updateMany(
    { _id: { $in: filteredRooms.map((r) => r._id) } },
    { $set: updateFields }
  );

  // ✅ Add blocked date to all rooms
  if (blockedDate) {
    await Room.updateMany(
      { _id: { $in: filteredRooms.map((r) => r._id) } },
      { $push: { blockedDates: blockedDate } }
    );
  }

  return successResponse(res, 200, "Bulk update successful", {
    updatedRooms: filteredRooms.length,
    updatedFields: Object.keys(updateFields),
    blockedDateAdded: blockedDate || null,
  });
});
