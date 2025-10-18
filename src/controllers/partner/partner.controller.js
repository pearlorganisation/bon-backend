import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { deleteFileFromCloudinary, uploadFileToCloudinary } from "../../utils/cloudinary.js";
import Property from "../../models/Listing/property.model.js";

// ✅ Create a new property
export const createProperty = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id; // partner from auth middleware

  const {
    name,
    description,
    address,
    city,
    state,
    country,
    pincode,
    geoLocation, // { coordinates: [lng, lat] }
    checkIn,
    checkOut,
    amenities,
    status,
  } = req.body;

  if (!name || !address || !city || !state || !country || !geoLocation || !Array.isArray(geoLocation.cordinates) || geoLocation.coordinates.length !== 2 || !Array.isArray(amenities)) {
    return next(new CustomError("Required fields missing", 400));
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

  const property = await Property.create({
    partnerId,
    name,
    description,
    address,
    city,
    state,
    country,
    pincode,
    geoLocation,
    checkIn,
    checkOut,
    amenities,
    status,
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
  const propertyId = req.params.id;

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
    "amenities",
    "status",
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      property[field] = req.body[field];
    }
  });

  // 3️⃣ Update geoLocation if provided
  if (req.body.geoLocation) {
    property.geoLocation = req.body.geoLocation; // { type: "Point", coordinates: [lng, lat] }
  }

  if (req.body.imagesToDelete) {
    req.body.imagesToDelete.forEach(async (image) => {
      const result = property.Images.filter(
        (img) => img.public_id != image.public_id
      );
      property.Images = result;
      await deleteFileFromCloudinary(image.public_id, "properties/images");
    });
  }

  if (req.body.videosToDelete) {
    req.body.videosToDelete.forEach(async (Video) => {
      const result = property.Videos.filter(
        (video) => video.public_id != Video.public_id
      );
      property.Videos = result;
      await deleteFileFromCloudinary(Video.public_id, "properties/videos");
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

  res.status(200).json({
    success: true,
    message: "Property updated successfully",
    data: property,
  });
});



export const getPartnerProperties = asyncHandler(async (req, res, next) => {
   
});


//export deleteParnterProperty = asyncHandler