import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../utils/cloudinary.js";
import Property from "../../models/Listing/property.model.js";
import { isAdmin } from "../../middleware/auth/auth.middleware.js";

// ✅ Create a new propertyw
export const createProperty = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id; // partner from auth middleware

  let {
    name,
    address,
    city,
    state,
    country,
    geoLocation, // { coordinates: [lng, lat] }
    amenities,
     propertyType,
    status,
  } = req.body;
  console.log(req.body);
  if (!name || !address || !city || !state || !country) {
    return next(new CustomError("Required fields missing", 400));
  }
  if (geoLocation) geoLocation = JSON.parse(geoLocation);
  if (amenities) amenities = JSON.parse(amenities);
  console.log(geoLocation, amenities);

  // ✅ Upload images and videos if provided
  let Images = [];
  let Videos = [];
  console.log(req.files);
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

  const property = await Property.create({
    ...req.body,
    amenities,
    geoLocation,
    partnerId,
    Images,
    Videos,
  });

  if (!property) {
    return next(new CustomError("property not created", 400));
  }

  successResponse(res, 201, "property created successfully ", property);
});

// ✅ Update property
export const updateProperty = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const propertyId = req.params.propertyId;

  // 1️⃣ Find property
  const property = await Property.findOne({ _id: propertyId, partnerId });
  if (!property) return next(new CustomError("Property not found", 404));

  // 2️⃣ Update simple fields (name, description, address, city, state, country, pincode, checkIn, checkOut, amenities, status)
  const updatableFields = [
    "name",
    "description",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "checkIn",
    "checkOut",
    "status",
    "propertyType",
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      property[field] = req.body[field];
    }
  });

  // 3️⃣ Update geoLocation if provided
  if (req.body?.geoLocation) {
    property.geoLocation = JSON.parse(req.body.geoLocation); // { type: "Point", coordinates: [lng, lat] }
  }
  if (req.body?.amenities) {
    property.amenities = JSON.parse(req.body.amenities); // { type: "Point", coordinates: [lng, lat] }
  }

  if (req.body.imagesToDelete) {
    let imagesToDelete = JSON.parse(req.body.imagesToDelete);
    imagesToDelete.forEach(async (image) => {
      const result = property.Images.filter(
        (img) => img.public_id != image.public_id
      );
      property.Images = result;
      await deleteFileFromCloudinary(image.public_id, "image");
    });
  }

  if (req.body?.videosToDelete) {
    let videosToDelete = JSON.parse(req.body.videosToDelete);
    videosToDelete.forEach(async (Video) => {
      const result = property.Videos.filter(
        (video) => video.public_id != Video.public_id
      );
      property.Videos = result;
      await deleteFileFromCloudinary(Video.public_id, "video");
    });
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

  property.Images.push(...Images);
  property.Videos.push(...Videos);

  // 6️⃣ Save property
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
  let properties;

  if (user.role === "ADMIN") {
    // Admin can see all properties
    properties = await Property.find();
  } else if (user.role === "PARTNER") {
    // Partner can see only their properties
    properties = await Property.find({ partnerId: user._id });
  } else {
    return next(new CustomError("Unauthorized", 401));
  }

  if (!properties.length) {
    return next(new CustomError("No properties found", 200));
  }

  const result = {
    properties,
    pending: [],
    under_review: [],
    approved: [],
    rejected: [],
    active: [],
    inactive: [],
    numberOfProperties: properties.length,
  };

  for (const prop of properties) {
    if (result[prop.status]) result[prop.status].push(prop);
    if (result[prop.verified]) result[prop.verified].push(prop);
  }

  successResponse(res, 200, "Successfully fetched partner properties", result);
});


//get Property by ID
export const getPartnerPropertyByID = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const propertyId = req.params.propertyId;
  console.log(propertyId);
  const property = await Property.findOne({ _id: propertyId, partnerId });
  // .populate("Rooms")
  // .populate("Bookings");

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
//export deleteParnterProperty = asyncHandler

//  ADD PROPERTY DETAILS (Policies, Documents, Payment, Approval)
export const addPropertyDetails = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const propertyId = req.params.propertyId;

  // Find property
  const property = await Property.findOne({ _id: propertyId, partnerId });
  if (!property) {
    return next(
      new CustomError("Property not found or not owned by this partner", 404)
    );
  }

  //  HOTEL POLICIES
  if (req.body.policies) {
    try {
      property.policies = JSON.parse(req.body.policies);
    } catch (error) {
      return next(new CustomError("Invalid JSON in policies", 400));
    }
  }

  //  DOCUMENT VERIFICATION
  if (req.body.documentVerification) {
    try {
      property.documentVerification = JSON.parse(req.body.documentVerification);
    } catch (error) {
      return next(new CustomError("Invalid JSON in documentVerification", 400));
    }
  }

  //  PROPERTY APPROVAL SECTION
  if (req.body.propertyApproval) {
    try {
      property.propertyApproval = JSON.parse(req.body.propertyApproval);
    } catch (error) {
      return next(new CustomError("Invalid JSON in propertyApproval", 400));
    }
  }

  //  PAYMENT DETAILS
  if (req.body.paymentDetails) {
    try {
      property.paymentDetails = JSON.parse(req.body.paymentDetails);
    } catch (error) {
      return next(new CustomError("Invalid JSON in paymentDetails", 400));
    }
  }

  //  MAP LINK (optional for location)
  if (req.body.mapLink) {
    property.mapLink = req.body.mapLink;
  }

  // FINAL: Save the updates
  await property.save();

  successResponse(
    res,
    200,
    "Property details added/updated successfully",
    property
  );
});

export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();

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

// get property by id

export const getPublicPropertyById = asyncHandler(async (req, res, next) => {
  const propertyId = req.params.propertyId;

  // 1️⃣ Fetch property
  const property = await Property.findById(propertyId)
    .populate("Rooms")      // optional
    .select(
      "name description address city state country geoLocation mapLink rating amenities Images Videos status createdAt updatedAt"
    );

  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  // 2️⃣ Ensure property is public/active
   if (property.status !== "active" && !isAdmin) {
    return next(
      new CustomError("This property is not available for public viewing", 403)
    );
  }

  // 3️⃣ Return only public-safe data
  successResponse(res, 200, "Property fetched successfully", property);
});