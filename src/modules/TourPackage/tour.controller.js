import Tour from "./tour.model.js";
import {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} from "../../utils/cloudinary.js";

import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";

const safeJSONParse = (data, fallback) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return fallback;
  }
};

export const createTour = asyncHandler(async (req, res, next) => {
  let {
    tourName,
    description,
    destinationCovered,
    tourType,
    duration,
    price,
    discountPrice,
    highlights,
    bannerText,
    priority,
    contact,
  } = req.body;

  const sanitizeValue = (val) => (val === "null" || val === "" ? null : val);

  discountPrice = sanitizeValue(discountPrice);
  price = sanitizeValue(price);
  priority = sanitizeValue(priority);

  /* ---------- PARSE ---------- */
  duration = safeJSONParse(duration, {});
  highlights = safeJSONParse(highlights, []);
  contact = safeJSONParse(contact, {});

  /* ---------- VALIDATION ---------- */
  if (!tourName || !destinationCovered || !price) {
    return next(new CustomError("Required fields missing", 400));
  }

  if (!duration?.days || !duration?.nights) {
    return next(new CustomError("Duration (days & nights) required", 400));
  }

  if (!contact?.phone || !contact?.email) {
    return next(new CustomError("Contact details required", 400));
  }

  /* ---------- DUPLICATE CHECK ---------- */
  const existing = await Tour.findOne({
    tourName: tourName.toLowerCase().trim(),
  });

  if (existing) {
    return next(new CustomError("Tour name already exists", 400));
  }

  /* ---------- IMAGE UPLOAD ---------- */
  let coverImage = {};
  if (req.file) {
    const uploaded = await uploadFileToCloudinary(req.file, "tours");
    coverImage = uploaded[0];
  }

  /* ---------- CREATE ---------- */
  const tour = await Tour.create({
    tourName: tourName.toLowerCase().trim(),
    description,
    destinationCovered,
    tourType,
    duration,
    price,
    discountPrice,
    highlights,
    bannerText,
    priority,
    contact,
    coverImage,
  });

  return successResponse(res, 201, "Tour created successfully", tour);
});

export const updateTour = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let {
    tourName,
    description,
    destinationCovered,
    tourType,
    duration,
    price,
    discountPrice,
    highlights,
    bannerText,
    priority,
    contact,
    status,
  } = req.body;

  const tour = await Tour.findById(id);
  if (!tour) {
    return next(new CustomError("Tour not found", 404));
  }

  /* ---------- SANITIZE NUMERIC/NULL STRINGS ---------- */
  // Convert string "null" or empty strings to actual null/undefined
  const sanitizeValue = (val) => (val === "null" || val === "" ? null : val);

  discountPrice = sanitizeValue(discountPrice);
  price = sanitizeValue(price);
  priority = sanitizeValue(priority);

  /* ---------- PARSE JSON FIELDS ---------- */
  duration = safeJSONParse(duration, tour.duration);
  highlights = safeJSONParse(highlights, tour.highlights);
  contact = safeJSONParse(contact, tour.contact);

  /* ---------- DUPLICATE NAME CHECK ---------- */
  if (tourName && tourName.toLowerCase() !== tour.tourName) {
    const exists = await Tour.findOne({
      tourName: tourName.toLowerCase(),
      _id: { $ne: id },
    });

    if (exists) {
      return next(new CustomError("Tour name already exists", 400));
    }
  }

  /* ---------- IMAGE UPDATE ---------- */
  let coverImage = tour.coverImage;

  if (req.file) {
    // delete old image
    if (tour.coverImage?.public_id) {
      await deleteFileFromCloudinary(tour.coverImage.public_id);
    }

    const uploaded = await uploadFileToCloudinary(req.file, "tours");
    coverImage = uploaded[0];
  }

  /* ---------- UPDATE ---------- */
  const updatedTour = await Tour.findByIdAndUpdate(
    id,
    {
      tourName: tourName?.toLowerCase().trim() || tour.tourName,
      description: description ?? tour.description,
      destinationCovered: destinationCovered ?? tour.destinationCovered,
      tourType: tourType ?? tour.tourType,
      price: price ?? tour.price,
      duration,
      discountPrice,
      highlights,
      bannerText,
      priority,
      contact,
      status,
      coverImage,
    },
    { new: true, runValidators: true },
  );

  return successResponse(res, 200, "Tour updated successfully", updatedTour);
});

export const deleteTour = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const tour = await Tour.findById(id);
  if (!tour) {
    return next(new CustomError("Tour not found", 404));
  }

  /* ---------- DELETE IMAGE ---------- */
  if (tour.coverImage?.public_id) {
    await deleteFileFromCloudinary(tour.coverImage.public_id);
  }

  await tour.deleteOne();

  return successResponse(res, 200, "Tour deleted successfully");
});

export const getAllTours = asyncHandler(async (req, res, next) => {
  const tours = await Tour.find().sort({
    createdAt: -1,
  });

  return successResponse(res, 200, "Tours fetched successfully", tours);
});

export const getTours = asyncHandler(async (req, res, next) => {
  const tours = await Tour.find({ status: "active" }).sort({
    priority: -1,
    createdAt: -1,
  });
  return successResponse(res, 200, "Tours fetched successfully", tours);
});
