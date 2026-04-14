import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import axios from "axios";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../utils/cloudinary.js";
import Property from "../../models/Listing/property.model.js";
import Room from "../../models/Listing/room.model.js";
import Partner from "../../models/Partner/partner.model.js";
import Auth from "../../models/auth/auth.model.js";
import { isAdmin } from "../../middleware/auth/auth.middleware.js";
import {
  getDatesBetween,
  normalizeDate,
} from "../Booking/booking.controller.js";
import RoomInventory from "../../models/Listing/roomInventory.model.js";
import mongoose from "mongoose";

function extractLatLngFromMapLink(mapLink) {
  if (!mapLink) return null;

  // Match @lat,lng pattern
  const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = mapLink.match(regex);

  if (match) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    };
  }

  // Match ?q=lat,lng format
  const queryRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const queryMatch = mapLink.match(queryRegex);

  if (queryMatch) {
    return {
      lat: parseFloat(queryMatch[1]),
      lng: parseFloat(queryMatch[2]),
    };
  }

  return null;
}

// ✅ Create a new property
export const createProperty = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const role = req.user.role;

  // ✅ SUB_ADMIN must send PartnerEmail
  if (role === "SUB_ADMIN" && !req.body.PartnerEmail) {
    return next(new CustomError("Partner email is required", 400));
  }

  let {
    name,
    address,
    city,
    state,
    country,
    mapLink,
    amenities,
    propertyType,
    status,
    PartnerEmail,
    policies,
    childrenCharge,
  } = req.body;

  // ✅ Required fields
  if (!name || !address || !city || !state || !country) {
    return next(new CustomError("Required fields missing", 400));
  }
  if (!mapLink) {
    return next(new CustomError("mapLink is required", 400));
  }

  // ✅ Parse JSON fields
  if (amenities) amenities = JSON.parse(amenities);
  if (policies) policies = JSON.parse(policies);
  // ✅ Upload images & videos
  let Images = [];
  let Videos = [];

  if (req.files?.images) {
    Images = await uploadFileToCloudinary(
      req.files.images,
      "properties/images"
    );
  }

  if (req.files?.videos) {
    Videos = await uploadFileToCloudinary(
      req.files.videos,
      "properties/videos"
    );
  }

  if (policies) {
    // ✅ Build data object (IMPORTANT PART)
    if (policies.checkInTime && typeof policies.checkInTime !== "string") {
      return res.status(400).json({ message: "checkInTime must be a string" });
    }
    if (policies.checkOutTime && typeof policies.checkOutTime !== "string") {
      return res.status(400).json({ message: "checkOutTime must be a string" });
    }

    // 3. Validate cancellationPolicy Array
    if (!Array.isArray(policies.cancellationPolicy)) {
      return res
        .status(400)
        .json({ message: "cancellationPolicy must be an array" });
    }

    // 4. Logic to validate each item in the array
    for (let i = 0; i < policies.cancellationPolicy.length; i++) {
      const policy = policies.cancellationPolicy[i];

      // Check for daysBeforeCheckIn
      if (
        typeof policy.daysBeforeCheckIn !== "number" ||
        policy.daysBeforeCheckIn < 0
      ) {
        return res.status(400).json({
          message: `Invalid daysBeforeCheckIn at index ${i}. Must be a positive number.`,
        });
      }

      // Check for refundPercentage (0 - 100)
      if (
        typeof policy.refundPercentage !== "number" ||
        policy.refundPercentage < 0 ||
        policy.refundPercentage > 100
      ) {
        return res.status(400).json({
          message: `Invalid refundPercentage at index ${i}. Must be between 0 and 100.`,
        });
      }
    }
  }

  const coords = extractLatLngFromMapLink(req.body.mapLink);

  if (!coords) {
    return next(new CustomError("Invalid Google Maps link", 400));
  }

  const geoLocation = {
    type: "Point",
    coordinates: [
      parseFloat(coords.lng), // longitude first
      parseFloat(coords.lat), // latitude second
    ],
  };

  if (childrenCharge) {
    if (childrenCharge.age < 2 && childrenCharge.age > 18) {
      return next(
        new CustomError("please enter valid age for children charges")
      );
    }
    if (!childrenCharge.charge)
      return next(new CustomError(" children charges required"));
  }

  const propertyData = {
    name,
    address,
    city,
    state,
    country,
    propertyType,
    status,
    amenities,
    mapLink,
    geoLocation,
    childrenCharge,
    Images,
    Videos,
    policies,
  };

  if (role === "PARTNER") {
    propertyData.partnerId = userId;
  }

  if (role === "SUB_ADMIN") {
    propertyData.subAdminId = userId;
    propertyData.PartnerEmail = PartnerEmail;
  }

  // ✅ Create property
  const property = await Property.create(propertyData);

  successResponse(res, 201, "Property created successfully", property);
});

export const updateProperty = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;
  const { _id: userId, role } = req.user;

  /** -----------------------------
   * 1️⃣ Build ownership condition
   ------------------------------*/
  let ownershipFilter = { _id: propertyId };

  if (role === "SUB_ADMIN") {
    ownershipFilter.subAdminId = userId;
    // ownershipFilter.partnerId = null;
  }

  if (role === "PARTNER") {
    ownershipFilter.partnerId = userId;
  }

  /** -----------------------------
   * 2️⃣ Find property
   ------------------------------*/
  const property = await Property.findOne(ownershipFilter);
  if (!property) {
    return next(new CustomError("Property not found or access denied", 404));
  }

  // 2️⃣ Update simple fields (name, description, address, city, state, country, pincode, checkIn, checkOut, amenities, status)
  const updatableFields = [
    "name",
    "description",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "PartnerEmail",
    "checkIn",
    "checkOut",
    "propertyType",
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      property[field] = req.body[field];
    }
  });

  if (role === "SUB_ADMIN" && req.body.PartnerEmail) {
    property.PartnerEmail = req.body.PartnerEmail;
  }

  // 3️⃣ Update geoLocation if provided
  if (req.body?.mapLink) {
    const { mapLink } = req.body; // Added this line to define mapLink
    const coords = extractLatLngFromMapLink(mapLink);

    if (!coords) {
      return next(new CustomError("Invalid Google Maps link", 400));
    }
    property.mapLink = mapLink; // This was throwing an error before

    property.geoLocation = {
      type: "Point",
      coordinates: [
        parseFloat(coords.lng), // longitude first
        parseFloat(coords.lat), // latitude second
      ],
    };
  }
  if (req.body?.amenities) {
    property.amenities = JSON.parse(req.body.amenities); // { type: "Point", coordinates: [lng, lat] }
  }

  if (req.body?.policies) {
    let policies = {};
    try {
      policies = JSON.parse(req.body.policies);
    } catch (err) {
      return next(new CustomError("Invalid policies format", 400));
    }

    if (policies.checkInTime && typeof policies.checkInTime !== "string") {
      return res.status(400).json({ message: "checkInTime must be a string" });
    }
    if (policies.checkOutTime && typeof policies.checkOutTime !== "string") {
      return res.status(400).json({ message: "checkOutTime must be a string" });
    }

    // 3. Validate cancellationPolicy Array
    if (!Array.isArray(policies.cancellationPolicy)) {
      return res
        .status(400)
        .json({ message: "cancellationPolicy must be an array" });
    }

    // 4. Logic to validate each item in the array
    for (let i = 0; i < policies.cancellationPolicy.length; i++) {
      const policy = policies.cancellationPolicy[i];

      // Check for daysBeforeCheckIn
      if (
        typeof policy.daysBeforeCheckIn !== "number" ||
        policy.daysBeforeCheckIn < 0
      ) {
        return res.status(400).json({
          message: `Invalid daysBeforeCheckIn at index ${i}. Must be a positive number.`,
        });
      }

      // Check for refundPercentage (0 - 100)
      if (
        typeof policy.refundPercentage !== "number" ||
        policy.refundPercentage < 0 ||
        policy.refundPercentage > 100
      ) {
        return res.status(400).json({
          message: `Invalid refundPercentage at index ${i}. Must be between 0 and 100.`,
        });
      }
    }

    property.policies = policies;
  }

  if (req.body?.childrenCharge) {
    let childrenCharge = JSON.parse(req.body.childrenCharge);
    if (childrenCharge) {
      if (childrenCharge.age < 2 && childrenCharge.age > 18) {
        return next(
          new CustomError("please enter valid age for children charges")
        );
      }
      if (!childrenCharge.charge)
        return next(new CustomError(" children charges required"));
    }
    property.childrenCharge = childrenCharge;
  }

  if (req.body?.imagesToDelete) {
    let imagesToDelete = [];

    try {
      imagesToDelete = JSON.parse(req.body.imagesToDelete);
    } catch (err) {
      return next(new CustomError("Invalid imagesToDelete format", 400));
    }

    const publicIdsToDelete = imagesToDelete.map((image) => image.public_id);

    // Remove images from property (once)
    property.Images = property.Images.filter(
      (img) => !publicIdsToDelete.includes(img.public_id)
    );

    // Delete from Cloudinary (sequential & safe)
    for (const publicId of publicIdsToDelete) {
      await deleteFileFromCloudinary(publicId, "image");
    }
  }

  if (req.body?.videosToDelete) {
    let videosToDelete = [];

    try {
      videosToDelete = JSON.parse(req.body.videosToDelete);
    } catch (err) {
      return next(new CustomError("Invalid videosToDelete format", 400));
    }

    const publicIdsToDelete = videosToDelete.map((video) => video.public_id);

    // Remove videos from property (once)
    property.Videos = property.Videos.filter(
      (video) => !publicIdsToDelete.includes(video.public_id)
    );

    // Delete from Cloudinary (sequential & safe)
    for (const publicId of publicIdsToDelete) {
      await deleteFileFromCloudinary(publicId, "video");
    }
  }

  if (req.body?.documentsToDelete) {
    let documentsToDelete = [];

    try {
      documentsToDelete = JSON.parse(req.body.documentsToDelete);
    } catch (err) {
      return next(new CustomError("Invalid documentsToDelete format", 400));
    }

    const publicIdsToDelete = documentsToDelete.map((doc) => doc.public_id);

    // Ensure array exists
    if (!property.documentVerification?.PropertyDocuments) {
      property.documentVerification.PropertyDocuments = [];
    }

    // Remove documents from property
    property.documentVerification.PropertyDocuments =
      property.documentVerification.PropertyDocuments.filter(
        (doc) => !publicIdsToDelete.includes(doc.public_id)
      );

    // Delete from Cloudinary (sequential & safe)
    for (const publicId of publicIdsToDelete) {
      await deleteFileFromCloudinary(publicId, "image");
    }
  }

  // ✅ Upload images and videos if provided
  let Images = [];
  let Videos = [];

  if (req.files?.images) {
    Images = await uploadFileToCloudinary(
      req.files.images,
      "properties/images"
    );
  }

  if (req.files?.videos) {
    Videos = await uploadFileToCloudinary(
      req.files.videos,
      "properties/videos"
    );
  }

  if (req.files?.propertyDocument) {
    const { document_name } = req.body;

    if (!document_name) {
      return next(new CustomError("Name of document is required", 400));
    }

    // Ensure array exists
    if (!property.documentVerification.PropertyDocuments) {
      property.documentVerification.PropertyDocuments = [];
    }

    const normalizedName = document_name.trim().toLowerCase();

    // 🔍 Check duplicate document name
    const duplicateName = property.documentVerification.PropertyDocuments.some(
      (doc) => doc.document_name === normalizedName
    );

    if (duplicateName) {
      return next(
        new CustomError("Document with this name already exists", 400)
      );
    }

    //  Upload to Cloudinary
    const uploadedDocs = await uploadFileToCloudinary(
      req.files.propertyDocument,
      "properties/documents"
    );

    // 📎 Push document
    property.documentVerification.PropertyDocuments.push({
      document_name: normalizedName,
      secure_url: uploadedDocs[0].secure_url,
      public_id: uploadedDocs[0].public_id,
    });
  }

  property.Images.push(...Images);
  property.Videos.push(...Videos);

  // 6️ Save property
  await property.save();

  successResponse(res, 200, "Property updated successfully", property);
});

// get all partner properties
// export const getPartnerProperties = asyncHandler(async (req, res, next) => {
//   const partnerId = req.user._id;

//   const properties = await Property.find({ partnerId });

//   if (!properties) {
//     return next(new CustomError("NO properties found", 200));
//   }

//   const result = {
//     properties: properties,
//     pending: [],
//     under_review: [],
//     approved: [],
//     rejected: [],
//     active: [],
//     inactive: [],
//     numberOfProperties: properties.length,
//   };

//   for (const prop of properties) {
//     result[prop.status].push(prop);
//     result[prop.verified].push(prop);
//   }

//   successResponse(res, 200, "successfully fetch partner properties", result);
// });

export const getPartnerProperties = asyncHandler(async (req, res, next) => {
  const user = req.user; // from auth middleware

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};

  if (user.role === "ADMIN") {
    // Admin can see all properties
    Object.assign(query, { verified: { $ne: "pending" } });
  } else if (user.role === "PARTNER") {
    // Partner can see only their properties
    Object.assign(query, { partnerId: user._id });
  } else if (user.role == "SUB_ADMIN") {
    Object.assign(query, { subAdminId: user._id });
  } else {
    return next(new CustomError("Unauthorized access", 403));
  }

  const a = Property.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const b = Property.countDocuments(query);

  const [properties, total] = await Promise.all([a, b]);

  successResponse(res, 200, "Successfully fetched partner properties", {
    total,
    page,
    totalPages: Math.ceil(total / limit),
    properties,
  });
});

//get Property by ID
export const getPartnerPropertyByID = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { propertyId } = req.params;

  let query = { _id: propertyId };

  // Role-based ownership check
  if (user.role === "PARTNER") {
    query.partnerId = user._id;
  } else if (user.role === "SUB_ADMIN") {
    query.subAdminId = user._id;
    query.partnerId = null;
  } else {
    return next(
      new CustomError("You are not authorized to access this property", 403)
    );
  }

  // Find property
  const property = await Property.findOne(query);

  if (!property) {
    return next(new CustomError("Property not found or access denied", 404));
  }

  if (!property) {
    return next(
      new CustomError("Property not found or not owned by this partner", 404)
    );
  }

  successResponse(
    res,
    200,
    "successfully fetch the partner property",
    property
  );
});

export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.aggregate([
      {
        $match: {
          partnerId: { $ne: null },
          // verified: "approved",
          // status: "active",
        },
      },

      {
        $lookup: {
          from: "partners",
          localField: "partnerId",
          foreignField: "userId",
          as: "partner",
        },
      },

      {
        $unwind: "$partner",
      },

      {
        $match: {
          "partner.isVerified": true,
        },
      },
      {
        $project: {
          partner: 0,
        },
      },
    ]);

    return successResponse(
      res,
      200,
      "Properties fetched successfully",
      properties
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

// ✅ Change Property Status (Active <--> Inactive) -- ADMIN ONLY
export const changePropertyStatus = asyncHandler(async (req, res, next) => {
  const adminId = req.user._id;
  const role = req.user.role;

  if (role !== "ADMIN") {
    return next(new CustomError("Only admin can change property status", 403));
  }

  const propertyId = req.params.propertyId;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return next(
      new CustomError("Status must be either 'active' or 'inactive'", 400)
    );
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  property.status = status;
  await property.save();

  successResponse(
    res,
    200,
    `Property status updated to ${status} successfully`,
    property
  );
});

// get property by id (Admin)
export const getPropertyDetailsById = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;

  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    return next(new CustomError("Invalid property ID", 400));
  }

  const property = await Property.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(propertyId),
      },
    },

    //  Partner Auth Lookup (SAFE)
    {
      $lookup: {
        from: "auths",
        localField: "partnerId",
        foreignField: "_id",
        as: "partnerAuth",
      },
    },
    { $unwind: { path: "$partnerAuth", preserveNullAndEmptyArrays: true } },

    // Partner Details Lookup (SAFE)
    {
      $lookup: {
        from: "partners",
        localField: "partnerId",
        foreignField: "userId",
        as: "partnerDetails",
      },
    },
    { $unwind: { path: "$partnerDetails", preserveNullAndEmptyArrays: true } },

    // ACTIVE Plan Lookup (SAFE even if partnerId null)
    {
      $lookup: {
        from: "partnerplans",
        let: { partnerId: "$partnerId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$partnerId", "$$partnerId"] },
                  { $eq: ["$planStatus", "ACTIVE"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "activePlan",
      },
    },
    { $unwind: { path: "$activePlan", preserveNullAndEmptyArrays: true } },

    //  SubAdmin Lookup
    {
      $lookup: {
        from: "auths",
        localField: "subAdminId",
        foreignField: "_id",
        as: "subAdmin",
      },
    },
    { $unwind: { path: "$subAdmin", preserveNullAndEmptyArrays: true } },

    //  Final Projection
    {
      $addFields: {
        partner: {
          $cond: {
            if: { $ne: ["$partnerAuth._id", null] },
            then: {
              _id: "$partnerAuth._id",
              name: "$partnerAuth.name",
              email: "$partnerAuth.email",
              isPanVerified: "$partnerDetails.isPanVerified",
              isVerified: "$partnerDetails.isVerified",
            },
            else: null,
          },
        },

        activePlan: {
          $cond: {
            if: { $ne: ["$activePlan._id", null] },
            then: "$activePlan",
            else: null,
          },
        },

        subAdmin: {
          $cond: {
            if: { $ne: ["$subAdmin._id", null] },
            then: {
              _id: "$subAdmin._id",
              name: "$subAdmin.name",
              email: "$subAdmin.email",
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        partnerAuth: 0,
        partnerDetails: 0,
      },
    },
  ]);

  if (!property.length) {
    return next(new CustomError("Property not found", 404));
  }

  successResponse(
    res,
    200,
    "Property detail fetched successfully",
    property[0]
  );
});

export const autoCompleteSuggestion = asyncHandler(async (req, res, next) => {
  const { text } = req.query;

  if (!text || text.trim() === "") {
    return next(new CustomError("Please provide search text", 400));
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      {
        params: {
          input: text,
          types: "geocode",
          components: "country:in",
          language: "en",
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 10000,
      }
    );

    const { status, predictions, error_message } = response.data;

    if (status !== "OK") {
      console.log(response);
      return next(
        new CustomError(error_message || `Google API Error: ${status}`, 400)
      );
    }

    const formattedResults = (predictions || []).map((place) => ({
      description: place.description,
      placeId: place.place_id,
    }));

    return successResponse(res, 200, "Place suggestions fetched successfully", {
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (error) {
    console.error("Google Places Autocomplete error:", error.message);

    //  This runs only for real HTTP / network errors
    if (error.code === "ECONNABORTED") {
      return next(new CustomError("Request timed out", 504));
    }

    if (error.response) {
      console.log(error);
      return next(
        new CustomError(
          error.response.data?.error_message || "Google API request failed",
          error.response.status || 500
        )
      );
    }

    return next(new CustomError("Internal Server Error", 500));
  }
});
async function getPlaceGeometry(placeId) {
  if (!placeId || typeof placeId !== "string" || placeId.trim() === "") {
    return {
      status: "INVALID_REQUEST",
      viewport: null,
      location: null,
      error: "placeId is required",
    };
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 10000, // 10 seconds timeout
      }
    );
    console.log(response.data);
    const { status, result, error_message } = response.data;
    if (status !== "OK") {
      return {
        status,
        viewport: null,
        location: null,
        error: error_message || "Google API error",
      };
    }

    const output = { status, viewport: null, location: null };

    output.location = result.geometry.location || null; // { lat: number, lng: number }
    output.viewport = result.geometry.viewport || null; // { northeast: {lat,lng}, southwest: {lat,lng} }

    return output;
  } catch (error) {
    console.error(`Google Place Details failed for ${placeId}:`, error.message);

    let apiStatus = "UNKNOWN_ERROR";
    let errorMsg = "Failed to fetch place details";

    if (error.response?.data) {
      apiStatus = error.response?.data.status || "ERROR";
      errorMsg = error.response?.data.error_message || errorMsg;
    } else if (error.code === "ECONNABORTED") {
      errorMsg = "Request timed out";
    }

    return {
      status: apiStatus,
      viewport: null,
      location: null,
      error: errorMsg,
    };
  }
}
export const searchProperties = asyncHandler(async (req, res, next) => {
  const {
    placeId,
    checkIn,
    checkOut,
    rooms = 1,
    propertyType,
    propertyId,
  } = req.query;

  if (!checkIn || !checkOut) {
    return next(new CustomError(" check-in and check-out are required", 400));
  }
  const checkInDate = normalizeDate(checkIn);
  const checkOutDate = normalizeDate(checkOut);
  if (checkInDate >= checkOutDate) {
    return next(new CustomError("Invalid date range", 400));
  }

  const dates = getDatesBetween(checkInDate, checkOutDate);
  console.log("dates", dates);
  let response = {};
  if (placeId) {
    response = await getPlaceGeometry(placeId);
    console.log("api", response);
    if (response.status != "OK") {
      return next(new CustomError(response.error, 400));
    }
    if (!response.viewport) {
      return next(new CustomError("Invalid viewport from Google", 400));
    }
  }
  const northEast = response?.viewport ? response.viewport.northeast : 0;
  const southWest = response?.viewport ? response.viewport.southwest : 0;
  // 1️ Find properties
  const propertyPipeline = [
    {
      $match: {
        status: "active",
        verified: "approved",
        ...(propertyType && { propertyType }),
        ...(propertyId && { _id: new mongoose.Types.ObjectId(propertyId) }),
        ...(placeId && {
          geoLocation: {
            $geoWithin: {
              $box: [
                [southWest.lng, southWest.lat], // bottom-left
                [northEast.lng, northEast.lat], // top-right
              ],
            },
          },
        }),
      },
    },
    // 2 Join Partner
    {
      $lookup: {
        from: "partners",
        localField: "partnerId",
        foreignField: "userId",
        as: "partner",
      },
    },
    { $unwind: "$partner" },

    // 3️ Only verified partners
    {
      $match: {
        "partner.isVerified": true,
      },
    },

    // 4️ Join Partner Plans
    {
      $lookup: {
        from: "partnerplans",
        localField: "partner.userId",
        foreignField: "partnerId",
        as: "plan",
      },
    },

    // 5️ Flatten plans
    {
      $unwind: "$plan",
    },

    // 6️ Keep only ACTIVE plan
    {
      $match: {
        "plan.planStatus": "ACTIVE",
      },
    },

    // 7️ Hide plan from response
    {
      $project: {
        plan: 0,
        partner: 0,
      },
    },
  ];

  const properties = await Property.aggregate(propertyPipeline);
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

export const getAllPropertyTypes = async (req, res) => {
  try {
    const types = await Property.distinct("propertyType");

    return successResponse(
      res,
      200,
      "Property types fetched successfully",
      types
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

export const getPropertyTypeWithProperties = async (req, res) => {
  try {
    const { type } = req.params;

    const properties = await Property.aggregate([
      {
        $match: {
          propertyType: type,
          partnerId: { $ne: null },
          verified: "approved",
          status: "active",
        },
      },
      {
        $lookup: {
          from: "partners",
          localField: "partnerId",
          foreignField: "userId",
          as: "partner",
        },
      },
      { $unwind: "$partner" },

      // 3️ Only verified partners
      {
        $match: {
          "partner.isVerified": true,
        },
      },

      // 4️ Join Partner Plans
      {
        $lookup: {
          from: "partnerplans",
          localField: "partner.userId",
          foreignField: "partnerId",
          as: "plan",
        },
      },

      // 5️ Flatten plans
      {
        $unwind: "$plan",
      },

      // 6️ Keep only ACTIVE plan
      {
        $match: {
          "plan.planStatus": "ACTIVE",
        },
      },

      // 7️ Hide plan from response
      {
        $project: {
          plan: 0,
          partner: 0,
        },
      },
    ]);

    return successResponse(
      res,
      200,
      `Properties for type: ${type}`,
      properties
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

// partner
export const requestPropertyApproval = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;
  const role = req.user.role;
  const userId = req.user._id;

  let property;

  if (role === "SUB_ADMIN") {
    property = await Property.findOne({
      _id: propertyId,
      subAdminId: userId,
    });
  } else if (role === "PARTNER") {
    const partner = await Partner.findOne({ userId });
    if (!partner) return next(new CustomError("Partner not found", 404));

    if (!partner.isVerified) {
      return next(
        new CustomError("Complete your KYC to verified you property", 404)
      );
    }

    property = await Property.findOne({
      _id: propertyId,
      partnerId: userId,
    });
  }

  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  if (property.verified == "approved") {
    return next(new CustomError("Property already approved", 400));
  }

  property.verified = "under_review";
  await property.save();

  successResponse(res, 200, "Property sent for admin approval", property);
});

// admin

export const getPropertyApprovalRequests = asyncHandler(
  async (req, res, next) => {
    const role = req.user.role;

    if (role !== "ADMIN") {
      return next(
        new CustomError(
          "Only admin can fetch all under_ reviewed properties",
          403
        )
      );
    }

    const properties = await Property.find({
      verified: "under_review",
    })
      .populate("partnerId", "name email")
      .populate("subAdminId", "name email");

    successResponse(res, 200, "Property approval requests fetched", properties);
  }
);

export const approveRejectProperty = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;
  const { action, reason } = req.body;

  if (!["approved", "rejected"].includes(action)) {
    return next(new CustomError("Invalid action", 400));
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  property.verified = action;
  if (reason) property.AdminNote = reason;

  await property.save();

  successResponse(res, 200, `Property ${action} successfully`, property);
});

export const assignPropertyToPartner = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;

  if (!propertyId) {
    return next(new CustomError("propertyId is required", 400));
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  if (property.verified !== "approved") {
    return next(
      new CustomError(
        `Only approved property can be assigned. Current status: ${property.verified}`,
        400
      )
    );
  }

  if (property.partnerId) {
    return next(
      new CustomError("Property is already assigned to a partner", 409)
    );
  }

  const partnerAuth = await Auth.findOne({
    email: property.PartnerEmail.toLowerCase(),
    role: "PARTNER",
  });

  if (!partnerAuth) {
    return next(new CustomError("Partner account not found", 404));
  }

  if (!partnerAuth.isVerified) {
    return next(
      new CustomError(`Partner ${partnerAuth.name} has not verified email`, 400)
    );
  }

  const partnerKyc = await Partner.findOne({
    userId: partnerAuth._id,
    isVerified: true,
  });

  if (!partnerKyc) {
    return next(
      new CustomError(`Partner ${partnerAuth.name} has not completed KYC`, 400)
    );
  }

  property.partnerId = partnerAuth._id;
  await property.save();

  return successResponse(
    res,
    200,
    `Property (${property.name}) assigned to partner (${partnerAuth.name})`
  );
});
