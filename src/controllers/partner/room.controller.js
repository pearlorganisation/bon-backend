import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../utils/cloudinary.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";

export const createRooms = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id; // from auth middleware
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
    dimensions
  } = req.body;

  const property = await Property.findOne({
    _id: propertyId,
    partnerId
  });
  if (!property) {
    return next(
      new CustomError(
        "You are not authorized to create  rooms for this property",
        403
      )
    );
  }

  // ✅ Validate required fields
  if (!numberOfRooms || numberOfRooms < 1) {
    return next(new CustomError("numberOfRooms must be at least 1", 400));
  }

  if (!name || !pricePerNight || !type || !bedType || !dimensions) {
    return next(
      new CustomError(
        "Name, pricePerNight, type, dimensions and bedType are required",
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
    dimensions 
  };

    // Validate dimensions
    const validUnits = ["ft", "m"];
    const validDimensions =
      dimensions &&
      typeof dimensions === "object" &&
      (!dimensions.unit || validUnits.includes(dimensions.unit));

    if (dimensions && !validDimensions) {
      return next(
        new CustomError("Invalid dimensions object or unit. Use ft or m.", 400)
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
    roomsToCreate.push({
      ...baseRoomData
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
    dimensions
  } = req.body;

  // ✅ Apply updates if provided
  if (name) room.name = name.trim().toLowerCase();
  if (capacity) room.capacity = capacity;
  if (pricePerNight) room.pricePerNight = pricePerNight;
  if (type) room.type = type.toLowerCase();
  if (amenities) room.amenities = amenities.map((a) => a.toLowerCase());
  if (bedType) room.bedType = bedType.toLowerCase();
  if (bedCount) room.bedCount = bedCount;
  if (blockedDates) room.blockedDates = blockedDates;
  if(dimensions) room.dimensions= dimensions;

    // Validate dimensions
    const validUnits = ["ft", "m"];
    const validDimensions =
      dimensions &&
      typeof dimensions === "object" &&
      (!dimensions.unit || validUnits.includes(dimensions.unit));

    if (dimensions && !validDimensions) {
      return next(
        new CustomError("Invalid dimensions object or unit. Use ft or m.", 400)
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
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id;
  let {
    types,
    pricePerNight,
    blockedDatesAdd,
    blockedDatesRemove,
    amenitiesAdd,
    amenitiesRemove,
    capacity,
    bedCount,
    bedType,
    dimensions
  } = req.body;


  const property = await Property.findOne({
    _id: propertyId,
    partnerId
  });
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

  // ✅ Validate blockedDatesAdd format
  if (blockedDatesAdd && !Array.isArray(blockedDatesAdd)) {
    return next(
      new CustomError("blockedDatesAdd must be an array of objects", 400)
    );
  }

  if (blockedDatesRemove && !Array.isArray(blockedDatesRemove)) {
    return next(
      new CustomError("blockedDatesRemove must be an array of objects", 400)
    );
  }

  // ✅ Find rooms to update
  const rooms = await Room.find({
    propertyId,
    type: {
      $in: types
    },
  });

  if (!rooms.length) {
    return next(
      new CustomError("No rooms found for the provided property and types", 404)
    );
  }

  // ✅ Static fields update
  const updateFields = {};
  if (pricePerNight !== undefined) updateFields.pricePerNight = pricePerNight;
  if (capacity !== undefined) updateFields.capacity = capacity;
  if (bedCount !== undefined) updateFields.bedCount = bedCount;
  if (bedType) updateFields.bedType = bedType.trim().toLowerCase();
  if(dimensions)updateFields.dimensions =dimensions;
    // Validate dimensions
    const validUnits = ["ft", "m"];
    const validDimensions =
      dimensions &&
      typeof dimensions === "object" &&
      (!dimensions.unit || validUnits.includes(dimensions.unit));

    if (dimensions && !validDimensions) {
      return next(
        new CustomError("Invalid dimensions object or unit. Use ft or m.", 400)
      );
    }

  const roomIds = rooms.map((room) => room._id);

  // ✅ Apply static field updates
  if (Object.keys(updateFields).length > 0) {
    await Room.updateMany({
      _id: {
        $in: roomIds
      }
    }, {
      $set: updateFields
    });
  }

  // ✅ Add amenities using $addToSet
  if (amenitiesAdd && Array.isArray(amenitiesAdd)) {
    await Room.updateMany({
      _id: {
        $in: roomIds
      }
    }, {
      $addToSet: {
        amenities: {
          $each: amenitiesAdd.map((a) => a.trim().toLowerCase())
        },
      },
    });
  }

  // ✅ Remove amenities using $pull
  if (amenitiesRemove && Array.isArray(amenitiesRemove)) {
    await Room.updateMany({
      _id: {
        $in: roomIds
      }
    }, {
      $pull: {
        amenities: {
          $in: amenitiesRemove.map((a) => a.trim().toLowerCase()),
        },
      },
    });
  }

  // ✅ Add blocked dates
  if (blockedDatesAdd && blockedDatesAdd.length > 0) {
    await Room.updateMany({
      _id: {
        $in: roomIds
      }
    }, {
      $addToSet: {
        blockedDates: {
          $each: blockedDatesAdd
        }
      }
    });
  }

  // ✅ Remove blocked dates (match by startDate & endDate)
  if (blockedDatesRemove && blockedDatesRemove.length > 0) {
    await Room.updateMany({
      _id: {
        $in: roomIds
      }
    }, {
      $pull: {
        blockedDates: {
          $or: blockedDatesRemove.map((d) => ({
            startDate: d.startDate,
            endDate: d.endDate,
          })),
        },
      },
    });
  }

  return successResponse(res, 200, "Bulk update successful", {
    updatedRooms: rooms.length,
    updatedFields: updateFields,
    blockedDatesAdded: blockedDatesAdd || null,
    blockedDatesRemoved: blockedDatesRemove || null,
    amenitiesAdded: amenitiesAdd || null,
    amenitiesRemoved: amenitiesRemove || null,
  });
});

//get types of rooms in  property
export const getTypesOfRoomsInProperty = asyncHandler(
  async (req, res, next) => {
    const propertyId = req.params.propertyId;
    const partnerId = req.user._id; //authenticated partner

    const property = await Property.findOne({
      _id: propertyId,
      partnerId
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
      propertyId: propertyId
    });

    return successResponse(res, 200, "Room types fetched successfully", rooms);
  }
);

//delete Rooms based on Types

export const deleteRoomsByTypes = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id; // Authenticating partner

  let {
    types
  } = req.body;

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
    partnerId
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
      $in: types
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
    partnerId
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
    propertyId
  })
  // .populate("Bookings");

  if (!rooms || rooms.length === 0) {
    return next(new CustomError("No rooms found for this property", 400));
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


export const setRoomsImagesandVideosInBulk = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const partnerId = req.user._id;

  let {
    types,
    imagesToDelete,
    videosToDelete
  } = req.body;

  // ✅ Validate types
   if(!types){
    new CustomError("Room types are required and must be an array", 400)
   }
   types= JSON.parse(types);
  if ( !Array.isArray(types) || types.length === 0) {
    return next(
      new CustomError("Room types are required and must be an array", 400)
    );
  }

  // 🔷 Normalize room types
  types = types.map((t) => t.toLowerCase().trim());

  // 1️⃣ Verify property belongs to partner
  const property = await Property.findOne({
    _id: propertyId,
    partnerId
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
      $in: types
    }
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
    newImages = await uploadFileToCloudinary(req.files.images, "rooms/images");
  }

  if (req.files?.videos) {
    newVideos = await uploadFileToCloudinary(req.files.videos, "rooms/videos");
  }

  // 4️⃣ Handle deletions (if any)
  if (imagesToDelete) {
    imagesToDelete = JSON.parse(imagesToDelete);
    for (let img of imagesToDelete) {
      await deleteFileFromCloudinary(img.public_id, "image");
    }

    // remove from all rooms’ image lists
    await Room.updateMany({
      propertyId,
      type: {
        $in: types
      }
    }, {
      $pull: {
        images: {
          public_id: {
            $in: imagesToDelete.map((i) => i.public_id)
          }
        },
      },
    });
  }

  if (videosToDelete) {
    videosToDelete = JSON.parse(videosToDelete);
    for (let vid of videosToDelete) {
      await deleteFileFromCloudinary(vid.public_id, "video");
    }

    await Room.updateMany({
      propertyId,
      type: {
        $in: types
      }
    }, {
      $pull: {
        videos: {
          public_id: {
            $in: videosToDelete.map((v) => v.public_id)
          }
        },
      },
    });
  }

  // 5️⃣ Add newly uploaded files to all rooms
  console.log(newImages,newVideos);
  if (newImages.length > 0 || newVideos.length > 0) {
    await Room.updateMany({
      propertyId,
      type: {
        $in: types
      }
    }, {
      $push: {
        images: {
          $each: newImages
        },
        videos: {
          $each: newVideos
        },
      },
    });
  }

  // 6️⃣ Fetch updated rooms
  const updatedRooms = await Room.find({
    propertyId,
    type: {
      $in: types
    }
  });

  return successResponse(res, 200, "Room images/videos updated successfully", {
    updatedRooms,
    addedImages: newImages,
    addedVideos: newVideos,
    deletedImages: imagesToDelete || [],
    deletedVideos: videosToDelete || [],
  });
});

export const setRoomImagesAndVideosById = asyncHandler(async (req, res, next) => {
  const {
    roomId
  } = req.params;
  const partnerId = req.user._id; // from auth middleware

  // ✅ 1️⃣ Find the room and verify ownership
  const room = await Room.findById(roomId).populate("propertyId");
  if (!room) {
    return next(new CustomError("Room not found", 404));
  }

  if (room.propertyId.partnerId.toString() !== partnerId.toString()) {
    return next(new CustomError("You are not authorized to modify this room", 403));
  }
 
  // ✅ 2️⃣ Handle deletions first
  if (req.body.imagesToDelete) {
    const imagesToDelete = JSON.parse(req.body.imagesToDelete);
    await Room.updateOne({
      _id: roomId
    }, {
      $pull: {
        images: {
          public_id: {
            $in: imagesToDelete.map((img) => img.public_id)
          }
        },
      },
    });

    for (const img of imagesToDelete) {
      await deleteFileFromCloudinary(img.public_id, "image");
    }
  }

  if (req.body.videosToDelete) {
    const videosToDelete = JSON.parse(req.body.videosToDelete);
    await Room.updateOne({
      _id: roomId
    }, {
      $pull: {
        videos: {
          public_id: {
            $in: videosToDelete.map((vid) => vid.public_id)
          }
        },
      },
    });

    for (const vid of videosToDelete) {
      await deleteFileFromCloudinary(vid.public_id, "video");
    }
  }

  // ✅ 3️⃣ Upload new files if provided
  let uploadedImages = [];
  let uploadedVideos = [];

  if (req.files?.images) {
    uploadedImages = await uploadFileToCloudinary(req.files.images, "rooms/images");
  
  }

  if (req.files?.videos) {
    uploadedVideos = await uploadFileToCloudinary(req.files.videos, "rooms/videos");
  }

   console.log(uploadedImages,uploadedVideos);
  // ✅ 4️⃣ Push new uploads into room
  if (uploadedImages.length > 0 || uploadedVideos.length > 0) {
    await Room.updateOne({
      _id: roomId
    }, {
      $push: {
        images: {
          $each: uploadedImages
        },
        videos: {
          $each: uploadedVideos
        },
      },
    });
  }

  // ✅ 5️⃣ Return updated room
  const updatedRoom = await Room.findById(roomId);

  return successResponse(res, 200, "Room media updated successfully", updatedRoom);
});