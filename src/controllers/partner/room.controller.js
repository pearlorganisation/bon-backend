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

// Helper function to handle FormData arrays (which might come as string if single item)
const parseArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  return [field];
};

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

  // =================================================================
  // ✅ FIX: Parse FormData Strings to Numbers/Objects
  // =================================================================

  // 1. Fix Dimensions (Convert strings "12" to numbers 12)
  if (dimensions && typeof dimensions === "object") {
    dimensions.length = Number(dimensions.length || 0);
    dimensions.width = Number(dimensions.width || 0);
    dimensions.height = Number(dimensions.height || 0);
  }

  // 2. Fix DistanceToBathroom
  if (distanceToBathroom && typeof distanceToBathroom === "object") {
    distanceToBathroom.value = Number(distanceToBathroom.value || 0);
  }

  // 3. Fix Numeric Fields (FormData sends these as strings)
  if (numberOfRooms) numberOfRooms = Number(numberOfRooms);
  if (capacity) capacity = Number(capacity);
  if (pricePerNight) pricePerNight = Number(pricePerNight);
  if (bedCount) bedCount = Number(bedCount);
  if (bathroomCount) bathroomCount = Number(bathroomCount);
  if (discount) discount = Number(discount);

  // 4. Fix Building Info Numbers
  if (buildingInfo && typeof buildingInfo === "object") {
    if (buildingInfo.totalFloors)
      buildingInfo.totalFloors = Number(buildingInfo.totalFloors);
    if (buildingInfo.constructionYear)
      buildingInfo.constructionYear = Number(buildingInfo.constructionYear);
  }

  // =================================================================

  const validUnits = ["ft", "m"];

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

  // ✅ Validate Dimensions Structure (Now works because we parsed them to Numbers above)
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

  let uploadedImages = [];
  let uploadedVideos = [];

  if (req.files?.images) {
    const errMsg = validateFileSize(req.files.images, "image");
    if (errMsg) return next(new CustomError(errMsg, 400));

    uploadedImages = await uploadFileToCloudinary(
      req.files.images,
      "rooms/images"
    );
  }

  if (req.files?.videos) {
    const errMsg = validateFileSize(req.files.videos, "video");
    if (errMsg) return next(new CustomError(errMsg, 400));

    uploadedVideos = await uploadFileToCloudinary(
      req.files.videos,
      "rooms/videos"
    );
  }

  const baseRoomData = {
    propertyId,
    name: name.trim(),
    capacity: capacity || 2,
    pricePerNight,
    type: type.toLowerCase(),
    // Parse arrays (handle single string vs array)
    amenities: parseArrayField(amenities).map((item) => item.trim()),
    bedType: bedType.toLowerCase(),
    bedCount: bedCount || 1,
    blockedDates: blockedDates || [],
    dimensions,
    distanceToBathroom,
    discount: discount || 0,
    bathroomType: bathroomType.toLowerCase(),
    bathroomCount: bathroomCount || 1,
    bathroomAmenities: parseArrayField(bathroomAmenities).map((item) =>
      item.trim()
    ),
    images: uploadedImages,
    videos: uploadedVideos,
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

  const room = await Room.findById(roomId).populate("propertyId");
  if (!room) return next(new CustomError("Room not found", 404));

  if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
    return next(
      new CustomError("You are not authorized to update this room", 403)
    );
  }

  let {
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

  // =================================================================
  // ✅ FIX: Parse FormData Strings to Numbers/Objects (Update Route)
  // =================================================================

  if (dimensions && typeof dimensions === "object") {
    dimensions.length = Number(dimensions.length || 0);
    dimensions.width = Number(dimensions.width || 0);
    dimensions.height = Number(dimensions.height || 0);
  }

  if (distanceToBathroom && typeof distanceToBathroom === "object") {
    distanceToBathroom.value = Number(distanceToBathroom.value || 0);
  }

  if (capacity) capacity = Number(capacity);
  if (pricePerNight) pricePerNight = Number(pricePerNight);
  if (discount) discount = Number(discount);
  if (bedCount) bedCount = Number(bedCount);
  if (bathroomCount) bathroomCount = Number(bathroomCount);

  if (buildingInfo && typeof buildingInfo === "object") {
    if (buildingInfo.totalFloors)
      buildingInfo.totalFloors = Number(buildingInfo.totalFloors);
    if (buildingInfo.constructionYear)
      buildingInfo.constructionYear = Number(buildingInfo.constructionYear);
  }
  // =================================================================

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

  if (req.files?.images) {
    const errMsg = validateFileSize(req.files.images, "image");
    if (errMsg) return next(new CustomError(errMsg, 400));

    const newImages = await uploadFileToCloudinary(
      req.files.images,
      "rooms/images"
    );
    room.images.push(...newImages);
  }

  if (req.files?.videos) {
    const errMsg = validateFileSize(req.files.videos, "video");
    if (errMsg) return next(new CustomError(errMsg, 400));

    const newVideos = await uploadFileToCloudinary(
      req.files.videos,
      "rooms/videos"
    );
    room.videos.push(...newVideos);
  }

  if (name) room.name = name.trim().toLowerCase();
  if (capacity) room.capacity = capacity;
  if (pricePerNight) room.pricePerNight = pricePerNight;
  if (discount) room.discount = discount;
  if (type) room.type = type.toLowerCase();
  if (amenities)
    room.amenities = parseArrayField(amenities).map((a) => a.toLowerCase());
  if (bedType) room.bedType = bedType.toLowerCase();
  if (bedCount) room.bedCount = bedCount;
  if (blockedDates) room.blockedDates = blockedDates;
  if (dimensions) room.dimensions = dimensions;
  if (bathroomType) room.bathroomType = bathroomType.toLowerCase();
  if (bathroomCount) room.bathroomCount = bathroomCount;
  if (distanceToBathroom) room.distanceToBathroom = distanceToBathroom;
  if (bathroomAmenities)
    room.bathroomAmenities = parseArrayField(bathroomAmenities).map((a) =>
      a.toLowerCase()
    );

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

  await room.save();

  return successResponse(res, 200, "Room updated successfully", room);
});

// ... (rest of the file remains unchanged: updateRoomsInBulk, getTypesOfRoomsInProperty, etc.)
export const updateRoomsInBulk = asyncHandler(async (req, res, next) => {
  // Note: If you use bulk update with formData, you will need to apply similar
  // Number() parsing logic here too, though bulk updates usually use raw JSON.
  // ... leave existing logic ...

  // (Existing code for updateRoomsInBulk goes here)
  // To keep the answer clean, I am assuming the rest of your file is unchanged.
  // However, if you are sending FormData to updateRoomsInBulk, you must add the parsing logic there too.

  // Standard implementation follows...
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

  const property = await Property.findOne({ _id: propertyId, partnerId });
  if (!property) {
    return next(
      new CustomError(
        "You are not authorized to update rooms for this property",
        403
      )
    );
  }

  if (!types || !Array.isArray(types) || types.length === 0) {
    return next(
      new CustomError("Room types are required and must be an array", 400)
    );
  }

  types = types.map((t) => t.toLowerCase().trim());

  const rooms = await Room.find({
    propertyId,
    type: { $in: types },
  });
  if (!rooms.length) {
    return next(
      new CustomError("No rooms found for the provided property and types", 404)
    );
  }

  const validBeds = ["single", "double", "queen", "king", "twin", "sofa-bed"];
  const validUnits = ["ft", "m"];
  const validBathroomTypes = ["private", "shared", "ensuite", "external"];

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

  // FIX FOR BULK UPDATE TOO
  if (dimensions && typeof dimensions === "object") {
    dimensions.length = Number(dimensions.length);
    dimensions.width = Number(dimensions.width);
    dimensions.height = Number(dimensions.height);
  }
  if (distanceToBathroom && typeof distanceToBathroom === "object") {
    distanceToBathroom.value = Number(distanceToBathroom.value);
  }

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

  const updateFields = {};
  if (pricePerNight !== undefined)
    updateFields.pricePerNight = Number(pricePerNight);
  if (discount !== undefined) updateFields.discount = Number(discount);
  if (capacity !== undefined) updateFields.capacity = Number(capacity);
  if (bedCount !== undefined) updateFields.bedCount = Number(bedCount);
  if (bedType) updateFields.bedType = bedType.toLowerCase().trim();
  if (bathroomType)
    updateFields.bathroomType = bathroomType.toLowerCase().trim();
  if (bathroomCount !== undefined)
    updateFields.bathroomCount = Number(bathroomCount);
  if (dimensions) updateFields.dimensions = dimensions;
  if (distanceToBathroom) updateFields.distanceToBathroom = distanceToBathroom;

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

  if (Object.keys(updateFields).length > 0) {
    await Room.updateMany({ _id: { $in: roomIds } }, { $set: updateFields });
  }

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

  if (blockedDatesAdd && Array.isArray(blockedDatesAdd)) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $addToSet: { blockedDates: { $each: blockedDatesAdd } },
      }
    );
  }

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

export const getTypesOfRoomsInProperty = asyncHandler(
  async (req, res, next) => {
    const propertyId = req.params.propertyId;
    const partnerId = req.user._id;

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

export const deleteRoomsByTypes = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id;

  let { types } = req.body;

  if (!types || !Array.isArray(types) || types.length === 0) {
    return next(
      new CustomError("Room types are required and must be an array", 400)
    );
  }

  types = types.map((t) => t.toLowerCase().trim());

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
  const partnerId = req.user._id;

  const room = await Room.findById(roomId).populate("propertyId");

  if (!room) {
    return next(new CustomError("Room not found", 404));
  }

  if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
    return next(
      new CustomError("You are not authorized to update this room", 403)
    );
  }

  const deleteRoom = await Room.findByIdAndDelete(roomId);

  return successResponse(res, 200, "Room delete  successfully", deleteRoom);
});

export const getRoomsByPropertyId = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  // const partnerId = req.user._id;

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  const rooms = await Room.find({
    propertyId,
  });

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

    if (!types) {
      new CustomError("Room types are required and must be an array", 400);
    }
    types = JSON.parse(types);
    if (!Array.isArray(types) || types.length === 0) {
      return next(
        new CustomError("Room types are required and must be an array", 400)
      );
    }

    types = types.map((t) => t.toLowerCase().trim());

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

    if (imagesToDelete) {
      imagesToDelete = JSON.parse(imagesToDelete);
      for (let img of imagesToDelete) {
        await deleteFileFromCloudinary(img.public_id, "image");
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
    const partnerId = req.user._id;

    const room = await Room.findById(roomId).populate("propertyId");
    if (!room) {
      return next(new CustomError("Room not found", 404));
    }

    if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
      return next(
        new CustomError("You are not authorized to modify this room", 403)
      );
    }

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

    const updatedRoom = await Room.findById(roomId);

    return successResponse(
      res,
      200,
      "Room media updated successfully",
      updatedRoom
    );
  }
);
