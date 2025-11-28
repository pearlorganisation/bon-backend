import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { validateFileSize } from "../../utils/validateFileSize.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../utils/cloudinary.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";

export const createRooms = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id;

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
    dimensions,
    discount,
    bathroomType,
    bathroomCount,
    distanceToBathroom,
    bathroomAmenities,
    // ✅ Extract New Fields
    servicesAndExtras,
    accessibility,
    safetyAndSecurity,
    activitiesAndSports,
    barAndEntertainment,
    transportation,
    poolAndSpa,
    cleaningServices,
    frontDeskServices,
    commonAreas,
    kidsAndFamily,
    buildingInfo,
    selfCheckIn,
    beddingAndComfort,
    bathroomFeatures,
    roomFacilities,
    mediaAndTechnology,
  } = req.body;

  const property = await Property.findOne({
    _id: propertyId,
    partnerId,
  });

  if (!property) {
    return next(
      new CustomError(
        "You are not authorized to create rooms for this property",
        403
      )
    );
  }

  // ✅ 1. Define Valid Units (Fixes the crash)
  const validUnits = ["ft", "m"];

  // ✅ Validate required fields
  if (!numberOfRooms || numberOfRooms < 1) {
    return next(new CustomError("numberOfRooms must be at least 1", 400));
  }

  if (
    !name ||
    !pricePerNight ||
    !type ||
    !bedType ||
    !dimensions ||
    !bathroomType
  ) {
    return next(
      new CustomError(
        "Name, pricePerNight, type, dimensions, bedType, and bathroomType are required",
        400
      )
    );
  }

  // ✅ Validate Dimensions Structure
  if (
    dimensions &&
    (typeof dimensions !== "object" ||
      dimensions === null ||
      typeof dimensions.length !== "number" ||
      typeof dimensions.width !== "number" ||
      typeof dimensions.height !== "number" ||
      !dimensions.unit ||
      !validUnits.includes(dimensions.unit))
  ) {
    return next(
      new CustomError(
        "Invalid dimensions object. Must include numeric length, width, height, and a valid unit ('ft' or 'm').",
        400
      )
    );
  }

  // ✅ Validate Distance To Bathroom Structure
  if (
    distanceToBathroom &&
    (typeof distanceToBathroom !== "object" ||
      distanceToBathroom.value == null ||
      typeof distanceToBathroom.value !== "number" ||
      !distanceToBathroom.unit ||
      !validUnits.includes(distanceToBathroom.unit))
  ) {
    return next(
      new CustomError(
        "Invalid distanceToBathroom object. Must include numeric value and unit ('ft' or 'm').",
        400
      )
    );
  }

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
  const validBathroom = ["private", "shared", "ensuite", "external"];

  if (!validTypes.includes(type.toLowerCase())) {
    return next(
      new CustomError(
        `Invalid room type. Allowed: ${validTypes.join(", ")}`,
        400
      )
    );
  }
  if (!validBeds.includes(bedType.toLowerCase())) {
    return next(
      new CustomError(`Invalid bed type. Allowed: ${validBeds.join(", ")}`, 400)
    );
  }
  if (!validBathroom.includes(bathroomType.toLowerCase())) {
    return next(
      new CustomError(
        `Invalid bathroom type. Allowed: ${validBathroom.join(", ")}`,
        400
      )
    );
  }

  // ✅ Convert fields and Prepare Data
  numberOfRooms = parseInt(numberOfRooms);

  const baseRoomData = {
    propertyId,
    name: name.trim(),
    capacity: capacity || 2,
    pricePerNight,
    type: type.toLowerCase(),
    amenities: amenities ? amenities.map((item) => item.trim()) : [],
    bedType: bedType.toLowerCase(),
    bedCount: bedCount || 1,
    blockedDates: blockedDates || [],
    dimensions,
    distanceToBathroom,
    discount: discount || 0,
    bathroomType: bathroomType.toLowerCase(),
    bathroomCount: bathroomCount || 1,
    bathroomAmenities: bathroomAmenities
      ? bathroomAmenities.map((item) => item.trim())
      : [],
    // ✅ Add New Fields to Base Data
    servicesAndExtras,
    accessibility,
    safetyAndSecurity,
    activitiesAndSports,
    barAndEntertainment,
    transportation,
    poolAndSpa,
    cleaningServices,
    frontDeskServices,
    commonAreas,
    kidsAndFamily,
    buildingInfo,
    selfCheckIn,
    beddingAndComfort,
    bathroomFeatures,
    roomFacilities,
    mediaAndTechnology,
  };

  // ✅ Create multiple rooms
  const roomsToCreate = [];
  for (let i = 0; i < numberOfRooms; i++) {
    roomsToCreate.push({
      ...baseRoomData,
    });
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
  const partnerId = req.user._id;
  const roomId = req.params.roomId;

  // ✅ Find the room and check ownership
  const room = await Room.findById(roomId).populate("propertyId");
  if (!room) return next(new CustomError("Room not found", 404));

  if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
    return next(
      new CustomError("You are not authorized to update this room", 403)
    );
  }

  // ✅ Extract updatable fields
  const {
    name,
    capacity,
    pricePerNight,
    discount,
    type,
    amenities,
    bedType,
    bedCount,
    blockedDates,
    dimensions,
    bathroomType,
    bathroomCount,
    distanceToBathroom,
    bathroomAmenities,
    // ✅ Extract New Fields
    servicesAndExtras,
    accessibility,
    safetyAndSecurity,
    activitiesAndSports,
    barAndEntertainment,
    transportation,
    poolAndSpa,
    cleaningServices,
    frontDeskServices,
    commonAreas,
    kidsAndFamily,
    buildingInfo,
    selfCheckIn,
    beddingAndComfort,
    bathroomFeatures,
    roomFacilities,
    mediaAndTechnology,
  } = req.body;

  // ✅ Validate ENUMs before assignment
  const validTypes = [
    "single",
    "double",
    "deluxe",
    "suite",
    "triple",
    "family",
  ];
  const validBeds = ["single", "double", "queen", "king", "twin", "sofa-bed"];
  const validUnits = ["ft", "m"];
  const validBathroomTypes = ["private", "shared", "ensuite", "external"];

  if (type && !validTypes.includes(type.toLowerCase())) {
    return next(
      new CustomError(
        `Invalid room type. Allowed: ${validTypes.join(", ")}`,
        400
      )
    );
  }

  if (bedType && !validBeds.includes(bedType.toLowerCase())) {
    return next(
      new CustomError(`Invalid bed type. Allowed: ${validBeds.join(", ")}`, 400)
    );
  }

  if (
    bathroomType &&
    !validBathroomTypes.includes(bathroomType.toLowerCase())
  ) {
    return next(
      new CustomError(
        `Invalid bathroom type. Allowed: ${validBathroomTypes.join(", ")}`,
        400
      )
    );
  }

  // ✅ Validate dimensions object
  if (
    dimensions &&
    (typeof dimensions !== "object" ||
      dimensions === null ||
      typeof dimensions.length !== "number" ||
      typeof dimensions.width !== "number" ||
      typeof dimensions.height !== "number" ||
      !dimensions.unit ||
      !validUnits.includes(dimensions.unit))
  ) {
    return next(
      new CustomError(
        "Invalid dimensions object. Must include numeric length, width, height, and valid unit ('ft' or 'm').",
        400
      )
    );
  }

  // ✅ Validate distanceToBathroom
  if (
    distanceToBathroom &&
    (typeof distanceToBathroom !== "object" ||
      distanceToBathroom === null ||
      typeof distanceToBathroom.value !== "number" ||
      !distanceToBathroom.unit ||
      !validUnits.includes(distanceToBathroom.unit))
  ) {
    return next(
      new CustomError(
        "Invalid distanceToBathroom object. Must include numeric value and valid unit ('ft' or 'm').",
        400
      )
    );
  }

  // ✅ Apply updates only if provided
  if (name) room.name = name.trim().toLowerCase();
  if (capacity) room.capacity = capacity;
  if (pricePerNight) room.pricePerNight = pricePerNight;
  if (discount) room.discount = discount;
  if (type) room.type = type.toLowerCase();
  if (amenities) room.amenities = amenities.map((a) => a.toLowerCase());
  if (bedType) room.bedType = bedType.toLowerCase();
  if (bedCount) room.bedCount = bedCount;
  if (blockedDates) room.blockedDates = blockedDates;
  if (dimensions) room.dimensions = dimensions;
  if (bathroomType) room.bathroomType = bathroomType.toLowerCase();
  if (bathroomCount) room.bathroomCount = bathroomCount;
  if (distanceToBathroom) room.distanceToBathroom = distanceToBathroom;
  if (bathroomAmenities)
    room.bathroomAmenities = bathroomAmenities.map((a) => a.toLowerCase());

  // ✅ Apply New Fields Updates
  if (servicesAndExtras) room.servicesAndExtras = servicesAndExtras;
  if (accessibility) room.accessibility = accessibility;
  if (safetyAndSecurity) room.safetyAndSecurity = safetyAndSecurity;
  if (activitiesAndSports) room.activitiesAndSports = activitiesAndSports;
  if (barAndEntertainment) room.barAndEntertainment = barAndEntertainment;
  if (transportation) room.transportation = transportation;
  if (poolAndSpa) room.poolAndSpa = poolAndSpa;
  if (cleaningServices) room.cleaningServices = cleaningServices;
  if (frontDeskServices) room.frontDeskServices = frontDeskServices;
  if (commonAreas) room.commonAreas = commonAreas;
  if (kidsAndFamily) room.kidsAndFamily = kidsAndFamily;
  if (buildingInfo) room.buildingInfo = buildingInfo;
  if (selfCheckIn) room.selfCheckIn = selfCheckIn;
  if (beddingAndComfort) room.beddingAndComfort = beddingAndComfort;
  if (bathroomFeatures) room.bathroomFeatures = bathroomFeatures;
  if (roomFacilities) room.roomFacilities = roomFacilities;
  if (mediaAndTechnology) room.mediaAndTechnology = mediaAndTechnology;

  // ✅ Save in DB
  await room.save();

  return successResponse(res, 200, "Room updated successfully", room);
});

export const updateRoomsInBulk = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id;

  let {
    types,
    pricePerNight,
    discount,
    blockedDatesAdd,
    blockedDatesRemove,
    amenitiesAdd,
    amenitiesRemove,
    capacity,
    bedCount,
    bedType,
    dimensions,
    bathroomType,
    bathroomCount,
    bathroomAmenitiesAdd,
    bathroomAmenitiesRemove,
    distanceToBathroom,
    // ✅ Extract New Fields for Bulk Update
    servicesAndExtras,
    accessibility,
    safetyAndSecurity,
    activitiesAndSports,
    barAndEntertainment,
    transportation,
    poolAndSpa,
    cleaningServices,
    frontDeskServices,
    commonAreas,
    kidsAndFamily,
    buildingInfo,
    selfCheckIn,
    beddingAndComfort,
    bathroomFeatures,
    roomFacilities,
    mediaAndTechnology,
  } = req.body;

  // ✅ Verify property ownership
  const property = await Property.findOne({ _id: propertyId, partnerId });
  if (!property) {
    return next(
      new CustomError(
        "You are not authorized to update rooms for this property",
        403
      )
    );
  }

  // ✅ Validate room types
  if (!types || !Array.isArray(types) || types.length === 0) {
    return next(
      new CustomError("Room types are required and must be an array", 400)
    );
  }

  // ✅ Normalize types
  types = types.map((t) => t.toLowerCase().trim());

  // ✅ Find target rooms
  const rooms = await Room.find({
    propertyId,
    type: { $in: types },
  });
  if (!rooms.length) {
    return next(
      new CustomError("No rooms found for the provided property and types", 404)
    );
  }

  // ✅ Validation constants
  const validBeds = ["single", "double", "queen", "king", "twin", "sofa-bed"];
  const validUnits = ["ft", "m"];
  const validBathroomTypes = ["private", "shared", "ensuite", "external"];

  // ✅ Validate ENUMs
  if (bedType && !validBeds.includes(bedType.toLowerCase())) {
    return next(
      new CustomError(`Invalid bed type. Allowed: ${validBeds.join(", ")}`, 400)
    );
  }

  if (
    bathroomType &&
    !validBathroomTypes.includes(bathroomType.toLowerCase())
  ) {
    return next(
      new CustomError(
        `Invalid bathroom type. Allowed: ${validBathroomTypes.join(", ")}`,
        400
      )
    );
  }

  // ✅ Validate dimensions
  if (
    dimensions &&
    (typeof dimensions !== "object" ||
      dimensions === null ||
      typeof dimensions.length !== "number" ||
      typeof dimensions.width !== "number" ||
      typeof dimensions.height !== "number" ||
      !dimensions.unit ||
      !validUnits.includes(dimensions.unit))
  ) {
    return next(
      new CustomError(
        "Invalid dimensions object. Must include numeric length, width, height, and valid unit ('ft' or 'm').",
        400
      )
    );
  }

  // ✅ Validate distanceToBathroom (if included)
  if (
    distanceToBathroom &&
    (typeof distanceToBathroom !== "object" ||
      distanceToBathroom === null ||
      typeof distanceToBathroom.value !== "number" ||
      !distanceToBathroom.unit ||
      !validUnits.includes(distanceToBathroom.unit))
  ) {
    return next(
      new CustomError(
        "Invalid distanceToBathroom object. Must include numeric value and valid unit ('ft' or 'm').",
        400
      )
    );
  }

  // ✅ Prepare static fields update
  const updateFields = {};
  if (pricePerNight !== undefined) updateFields.pricePerNight = pricePerNight;
  if (discount !== undefined) updateFields.discount = discount;
  if (capacity !== undefined) updateFields.capacity = capacity;
  if (bedCount !== undefined) updateFields.bedCount = bedCount;
  if (bedType) updateFields.bedType = bedType.toLowerCase().trim();
  if (bathroomType)
    updateFields.bathroomType = bathroomType.toLowerCase().trim();
  if (bathroomCount !== undefined) updateFields.bathroomCount = bathroomCount;
  if (dimensions) updateFields.dimensions = dimensions;
  if (distanceToBathroom) updateFields.distanceToBathroom = distanceToBathroom;

  // ✅ Add New Fields to Bulk Update Object
  if (servicesAndExtras) updateFields.servicesAndExtras = servicesAndExtras;
  if (accessibility) updateFields.accessibility = accessibility;
  if (safetyAndSecurity) updateFields.safetyAndSecurity = safetyAndSecurity;
  if (activitiesAndSports)
    updateFields.activitiesAndSports = activitiesAndSports;
  if (barAndEntertainment)
    updateFields.barAndEntertainment = barAndEntertainment;
  if (transportation) updateFields.transportation = transportation;
  if (poolAndSpa) updateFields.poolAndSpa = poolAndSpa;
  if (cleaningServices) updateFields.cleaningServices = cleaningServices;
  if (frontDeskServices) updateFields.frontDeskServices = frontDeskServices;
  if (commonAreas) updateFields.commonAreas = commonAreas;
  if (kidsAndFamily) updateFields.kidsAndFamily = kidsAndFamily;
  if (buildingInfo) updateFields.buildingInfo = buildingInfo;
  if (selfCheckIn) updateFields.selfCheckIn = selfCheckIn;
  if (beddingAndComfort) updateFields.beddingAndComfort = beddingAndComfort;
  if (bathroomFeatures) updateFields.bathroomFeatures = bathroomFeatures;
  if (roomFacilities) updateFields.roomFacilities = roomFacilities;
  if (mediaAndTechnology) updateFields.mediaAndTechnology = mediaAndTechnology;

  const roomIds = rooms.map((r) => r._id);

  // ✅ Apply static updates
  if (Object.keys(updateFields).length > 0) {
    await Room.updateMany({ _id: { $in: roomIds } }, { $set: updateFields });
  }

  // ✅ Add amenities
  if (amenitiesAdd && Array.isArray(amenitiesAdd)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $addToSet: {
          amenities: {
            $each: amenitiesAdd.map((a) => a.trim().toLowerCase()),
          },
        },
      }
    );
  }

  // ✅ Remove amenities
  if (amenitiesRemove && Array.isArray(amenitiesRemove)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $pull: {
          amenities: {
            $in: amenitiesRemove.map((a) => a.trim().toLowerCase()),
          },
        },
      }
    );
  }

  // ✅ Add bathroom amenities
  if (bathroomAmenitiesAdd && Array.isArray(bathroomAmenitiesAdd)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $addToSet: {
          bathroomAmenities: {
            $each: bathroomAmenitiesAdd.map((a) => a.trim().toLowerCase()),
          },
        },
      }
    );
  }

  // ✅ Remove bathroom amenities
  if (bathroomAmenitiesRemove && Array.isArray(bathroomAmenitiesRemove)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $pull: {
          bathroomAmenities: {
            $in: bathroomAmenitiesRemove.map((a) => a.trim().toLowerCase()),
          },
        },
      }
    );
  }

  // ✅ Add blocked dates
  if (blockedDatesAdd && Array.isArray(blockedDatesAdd)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $addToSet: { blockedDates: { $each: blockedDatesAdd } },
      }
    );
  }

  // ✅ Remove blocked dates
  if (blockedDatesRemove && Array.isArray(blockedDatesRemove)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $pull: {
          blockedDates: {
            $or: blockedDatesRemove.map((d) => ({
              startDate: d.startDate,
              endDate: d.endDate,
            })),
          },
        },
      }
    );
  }

  // ✅ Success response
  return successResponse(res, 200, "Bulk update successful", {
    updatedRooms: rooms.length,
    updatedFields: updateFields,
    blockedDatesAdded: blockedDatesAdd || null,
    blockedDatesRemoved: blockedDatesRemove || null,
    amenitiesAdded: amenitiesAdd || null,
    amenitiesRemoved: amenitiesRemove || null,
    bathroomAmenitiesAdded: bathroomAmenitiesAdd || null,
    bathroomAmenitiesRemoved: bathroomAmenitiesRemove || null,
  });
});

//get types of rooms in  property
export const getTypesOfRoomsInProperty = asyncHandler(
  async (req, res, next) => {
    const propertyId = req.params.propertyId;
    const partnerId = req.user._id; //authenticated partner

    const property = await Property.findOne({
      _id: propertyId,
      partnerId,
    });
    if (!property) {
      return next(
        new CustomError(
          "You are not authorized to get Types rooms for this property",
          403
        )
      );
    }

    const rooms = await Room.distinct("type", {
      propertyId: propertyId,
    });

    return successResponse(res, 200, "Room types fetched successfully", rooms);
  }
);

//delete Rooms based on Types

export const deleteRoomsByTypes = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id; // Authenticating partner

  let { types } = req.body;

  // ✅ Validate types
  if (!types || !Array.isArray(types) || types.length === 0) {
    return next(
      new CustomError("Room types are required and must be an array", 400)
    );
  }

  // 🔷 Normalize room types
  types = types.map((t) => t.toLowerCase().trim());

  //  Step 1: Verify property belongs to the logged-in partner
  const property = await Property.findOne({
    _id: propertyId,
    partnerId,
  });
  if (!property) {
    return next(
      new CustomError(
        "You are not authorized to delete rooms for this property",
        403
      )
    );
  }

  //  Step 2: Delete rooms only owned by that partner in this property
  const deleteResult = await Room.deleteMany({
    propertyId,
    type: {
      $in: types,
    },
  });

  if (deleteResult.deletedCount === 0) {
    return next(
      new CustomError(
        "No rooms found with specified types for this property",
        404
      )
    );
  }

  return successResponse(res, 200, "Rooms deleted successfully", {
    deletedRooms: deleteResult.deletedCount,
  });
});

export const deleteRoom = asyncHandler(async (req, res, next) => {
  const roomId = req.params.roomId;
  const partnerId = req.user._id; // Authenticating partner

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

  const deleteRoom = await Room.findByIdAndDelete(roomId);

  return successResponse(res, 200, "Room delete  successfully", deleteRoom);
});

//get rooms by property id,

export const getRoomsByPropertyId = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;

  const partnerId = req.user._id; // from auth middleware

  //  Step 1: Verify property belongs to the logged-in partner
  const property = await Property.findOne({
    _id: propertyId,
    partnerId,
  });
  if (!property) {
    return next(
      new CustomError(
        "You are not authorized to get rooms for this property",
        403
      )
    );
  }

  const rooms = await Room.find({
    propertyId,
  });
  // .populate("Bookings");

  if (!rooms || rooms.length === 0) {
    return successResponse(res, 200, "No rooms yet for this property", {});
  }

  const typesOfRooms = {};

  for (let room of rooms) {
    if (!typesOfRooms[room.type]) {
      typesOfRooms[room.type] = [];
    }
    typesOfRooms[room.type].push(room);
  }

  return successResponse(res, 200, "Rooms fetched Successfully ", typesOfRooms);
});

export const setRoomsImagesandVideosInBulk = asyncHandler(
  async (req, res, next) => {
    const propertyId = req.params.propertyId;
    const partnerId = req.user._id;

    let { types, imagesToDelete, videosToDelete } = req.body;

    // ✅ Validate types
    if (!types) {
      new CustomError("Room types are required and must be an array", 400);
    }
    types = JSON.parse(types);
    if (!Array.isArray(types) || types.length === 0) {
      return next(
        new CustomError("Room types are required and must be an array", 400)
      );
    }

    // 🔷 Normalize room types
    types = types.map((t) => t.toLowerCase().trim());

    // 1️⃣ Verify property belongs to partner
    const property = await Property.findOne({
      _id: propertyId,
      partnerId,
    });
    if (!property) {
      return next(
        new CustomError(
          "You are not authorized to update rooms for this property",
          403
        )
      );
    }

    // 2️⃣ Find rooms of these types under this property
    const rooms = await Room.find({
      propertyId,
      type: {
        $in: types,
      },
    });

    if (!rooms || rooms.length === 0) {
      return next(
        new CustomError("No rooms found for the specified types", 404)
      );
    }

    // 3️⃣ Handle file uploads
    let newImages = [];
    let newVideos = [];

    if (req.files?.images) {
      const errMsg = validateFileSize(req.files.images, "image");
      if (errMsg) {
        return next(new CustomError(errMsg, 400));
      }
      newImages = await uploadFileToCloudinary(
        req.files.images,
        "rooms/images"
      );
    }

    if (req.files?.videos) {
      const errMsg = validateFileSize(req.files.videos, "video");
      if (errMsg) {
        return next(new CustomError(errMsg, 400));
      }
      newVideos = await uploadFileToCloudinary(
        req.files.videos,
        "rooms/videos"
      );
    }

    // 4️⃣ Handle deletions (if any)
    if (imagesToDelete) {
      imagesToDelete = JSON.parse(imagesToDelete);
      for (let img of imagesToDelete) {
        await deleteFileFromCloudinary(img.public_id, "image");
      }

      // remove from all rooms’ image lists
      await Room.updateMany(
        {
          propertyId,
          type: {
            $in: types,
          },
        },
        {
          $pull: {
            images: {
              public_id: {
                $in: imagesToDelete.map((i) => i.public_id),
              },
            },
          },
        }
      );
    }

    if (videosToDelete) {
      videosToDelete = JSON.parse(videosToDelete);
      for (let vid of videosToDelete) {
        await deleteFileFromCloudinary(vid.public_id, "video");
      }

      await Room.updateMany(
        {
          propertyId,
          type: {
            $in: types,
          },
        },
        {
          $pull: {
            videos: {
              public_id: {
                $in: videosToDelete.map((v) => v.public_id),
              },
            },
          },
        }
      );
    }

    // 5️⃣ Add newly uploaded files to all rooms
    console.log(newImages, newVideos);
    if (newImages.length > 0 || newVideos.length > 0) {
      await Room.updateMany(
        {
          propertyId,
          type: {
            $in: types,
          },
        },
        {
          $push: {
            images: {
              $each: newImages,
            },
            videos: {
              $each: newVideos,
            },
          },
        }
      );
    }

    // 6️⃣ Fetch updated rooms
    const updatedRooms = await Room.find({
      propertyId,
      type: {
        $in: types,
      },
    });

    return successResponse(
      res,
      200,
      "Room images/videos updated successfully",
      {
        updatedRooms,
        addedImages: newImages,
        addedVideos: newVideos,
        deletedImages: imagesToDelete || [],
        deletedVideos: videosToDelete || [],
      }
    );
  }
);

export const setRoomImagesAndVideosById = asyncHandler(
  async (req, res, next) => {
    const { roomId } = req.params;
    const partnerId = req.user._id; // from auth middleware

    // ✅ 1️⃣ Find the room and verify ownership
    const room = await Room.findById(roomId).populate("propertyId");
    if (!room) {
      return next(new CustomError("Room not found", 404));
    }

    if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
      return next(
        new CustomError("You are not authorized to modify this room", 403)
      );
    }

    // ✅ 2️⃣ Handle deletions first
    if (req.body.imagesToDelete) {
      const imagesToDelete = JSON.parse(req.body.imagesToDelete);
      await Room.updateOne(
        {
          _id: roomId,
        },
        {
          $pull: {
            images: {
              public_id: {
                $in: imagesToDelete.map((img) => img.public_id),
              },
            },
          },
        }
      );

      for (const img of imagesToDelete) {
        await deleteFileFromCloudinary(img.public_id, "image");
      }
    }

    if (req.body.videosToDelete) {
      const videosToDelete = JSON.parse(req.body.videosToDelete);
      await Room.updateOne(
        {
          _id: roomId,
        },
        {
          $pull: {
            videos: {
              public_id: {
                $in: videosToDelete.map((vid) => vid.public_id),
              },
            },
          },
        }
      );

      for (const vid of videosToDelete) {
        await deleteFileFromCloudinary(vid.public_id, "video");
      }
    }

    // ✅ 3️⃣ Upload new files if provided
    let uploadedImages = [];
    let uploadedVideos = [];

    if (req.files?.images) {
      uploadedImages = await uploadFileToCloudinary(
        req.files.images,
        "rooms/images"
      );
    }

    if (req.files?.videos) {
      uploadedVideos = await uploadFileToCloudinary(
        req.files.videos,
        "rooms/videos"
      );
    }

    console.log(uploadedImages, uploadedVideos);
    // ✅ 4️⃣ Push new uploads into room
    if (uploadedImages.length > 0 || uploadedVideos.length > 0) {
      await Room.updateOne(
        {
          _id: roomId,
        },
        {
          $push: {
            images: {
              $each: uploadedImages,
            },
            videos: {
              $each: uploadedVideos,
            },
          },
        }
      );
    }

    // ✅ 5️⃣ Return updated room
    const updatedRoom = await Room.findById(roomId);

    return successResponse(
      res,
      200,
      "Room media updated successfully",
      updatedRoom
    );
  }
);
