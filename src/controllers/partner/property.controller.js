import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../utils/cloudinary.js";
import Property from "../../models/Listing/property.model.js";

// ✅ Create a new property
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
export const getPartnerProperties = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;

  const properties = await Property.find({ partnerId });

  if (!properties) {
    return next(new CustomError("NO properties found", 200));
  }

  const result = {
    properties: properties,
    pending: [],
    under_review: [],
    approved: [],
    rejected: [],
    active: [],
    inactive: [],
    numberOfProperties: properties.length,
  };

  for (const prop of properties) {
    result[prop.status].push(prop);
    result[prop.verified].push(prop);
  }

  successResponse(res, 200, "successfully fetch partner properties", result);
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
