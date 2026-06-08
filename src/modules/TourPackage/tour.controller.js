import mongoose from "mongoose";
import Trip from "./tour.model.js";
import slugify from "slugify";
import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import { uploadFileToCloudinary } from "../../utils/cloudinary.js";
import { sendTripEnquiryEmail } from "../../utils/mail/EmailTemplates/emailTemplate.js";
import PlatformSettings from "../../models/PlatformSettings/platformSettings.model.js";

//create trip
export const createTrip = asyncHandler(async (req, res, next) => {
  // 1. Destructure fields from req.body
  let {
    title,
    summary,
    aboutTrip,
    highlights,
    itinerary,
    inclusions,
    exclusions,
    thingsToCarry,
    generalPolicy,
    cancellationPolicy,
    faqs,
    batches,
  } = req.body;

  // 2. PARSE JSON STRINGS (Crucial for Multer/Multipart-form-data)
  try {
    if (summary && typeof summary === "string") summary = JSON.parse(summary);
    if (highlights && typeof highlights === "string") highlights = JSON.parse(highlights);
    if (itinerary && typeof itinerary === "string") itinerary = JSON.parse(itinerary);
    if (inclusions && typeof inclusions === "string") inclusions = JSON.parse(inclusions);
    if (exclusions && typeof exclusions === "string") exclusions = JSON.parse(exclusions);
    if (thingsToCarry && typeof thingsToCarry === "string") thingsToCarry = JSON.parse(thingsToCarry);
    if (generalPolicy && typeof generalPolicy === "string") generalPolicy = JSON.parse(generalPolicy);
    if (cancellationPolicy && typeof cancellationPolicy === "string") cancellationPolicy = JSON.parse(cancellationPolicy);
    if (faqs && typeof faqs === "string") faqs = JSON.parse(faqs);
    if (batches && typeof batches === "string") batches = JSON.parse(batches);
  } catch (error) {
    return next(new CustomError("Invalid JSON format in text fields", 400));
  }

  const groupedFiles = {};

(req.files || []).forEach((file) => {
  if (!groupedFiles[file.fieldname]) {
    groupedFiles[file.fieldname] = [];
  }

  groupedFiles[file.fieldname].push(file);
});

if (!groupedFiles.gallery?.length) {
  return next(new CustomError("At least one gallery image is required", 400));
}

  if (!title?.trim()) {
    return next(new CustomError("Trip title is required", 400));
  }

  if (!aboutTrip?.trim()) {
    return next(new CustomError("About trip is required", 400));
  }

  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
    return next(new CustomError("At least one itinerary day is required", 400));
  }

  if (!batches || !Array.isArray(batches) || batches.length === 0) {
    return next(new CustomError("At least one batch is required", 400));
  }

// 4. UPLOAD IMAGES TO CLOUDINARY
let gallery = [];

if (groupedFiles.gallery?.length) {
  gallery = await uploadFileToCloudinary(
    groupedFiles.gallery,
    "trips/gallery"
  );
}

for (let i = 0; i < itinerary.length; i++) {
  const fieldName = `dayImages_${i}`;

  if (groupedFiles[fieldName]?.length) {
    const uploadedImages = await uploadFileToCloudinary(
      groupedFiles[fieldName],
      "trips/itinerary"
    );

    itinerary[i].dayImages = uploadedImages;
  } else {
    itinerary[i].dayImages = [];
  }
}

  // 5. SLUG GENERATION & DUPLICATE CHECK
  const slug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  const existingTrip = await Trip.findOne({ slug });
  if (existingTrip) {
    return next(new CustomError("Trip with same title already exists", 400));
  }

  // 6. DETAILED DATA VALIDATION
  // Validate Itinerary
  itinerary.forEach((day, index) => {
    if (!day.title?.trim()) {
      throw new CustomError(`Title missing for day ${index + 1}`, 400);
    }
    if (Number(day.dayNumber) !== index + 1) {
      throw new CustomError("Day numbers should be sequential (1,2,3...)", 400);
    }
  });

  // Validate FAQs
  if (faqs?.length) {
    faqs.forEach((faq) => {
      if (!faq.question || !faq.answer) {
        throw new CustomError("FAQ question and answer are required", 400);
      }
    });
  }

  // Validate Batches
  batches.forEach((batch) => {
    const startDate = new Date(batch.startDate);
    const endDate = new Date(batch.endDate);

    if (endDate <= startDate) {
      throw new CustomError("Batch end date must be greater than start date", 400);
    }

    if (batch.occupiedSeats && Number(batch.occupiedSeats) > Number(batch.totalSeats)) {
      throw new CustomError("Occupied seats cannot exceed total seats", 400);
    }

    if (Number(batch.pricePerPerson) <= 0) {
      throw new CustomError("Price per person must be greater than zero", 400);
    }
  });

  // 7. CREATE DATABASE RECORD
  const trip = await Trip.create({
    title,
    slug,
    gallery,
    summary,
    aboutTrip,
    highlights,
    itinerary,
    inclusions,
    exclusions,
    thingsToCarry,
    generalPolicy,
    cancellationPolicy,
    faqs,
    batches,
  });

  // 8. RESPONSE
  res.status(201).json({
    success: true,
    message: "Trip created successfully",
    data: trip,
  });
});


//get all trips
export const getAllTrips = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  const trips = await Trip.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalTrips = await Trip.countDocuments(filter);

  res.status(200).json({
    success: true,
    message: "Trips fetched successfully",
    data: trips,
    pagination: {
      total: totalTrips,
      page,
      limit,
      totalPages: Math.ceil(totalTrips / limit),
    },
  });
});


//get by slug
export const getTripBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const trip = await Trip.findOne({ slug });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip fetched successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Get Trip By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


//delete trip by id
export const deleteTrip = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new CustomError("Trip ID is required", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new CustomError("Invalid Trip ID", 400));
  }

  const trip = await Trip.findById(id);

  if (!trip) {
    return next(new CustomError("Trip not found", 404));
  }

  await Trip.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Trip deleted successfully",
  });
});


//update trip by id
export const updateTrip = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1. Check if ID is valid and Trip exists
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new CustomError("Invalid Trip ID", 400));
  }

  let trip = await Trip.findById(id);
  if (!trip) {
    return next(new CustomError("Trip not found", 404));
  }

  // 2. Destructure and Parse JSON strings from req.body
  let {
    title,
    summary,
    aboutTrip,
    highlights,
    itinerary,
    inclusions,
    exclusions,
    thingsToCarry,
    generalPolicy,
    cancellationPolicy,
    faqs,
    batches,
    existingGallery, // Images user wants to keep in gallery
  } = req.body;

  try {
    if (summary && typeof summary === "string") summary = JSON.parse(summary);
    if (highlights && typeof highlights === "string") highlights = JSON.parse(highlights);
    if (itinerary && typeof itinerary === "string") itinerary = JSON.parse(itinerary);
    if (inclusions && typeof inclusions === "string") inclusions = JSON.parse(inclusions);
    if (exclusions && typeof exclusions === "string") exclusions = JSON.parse(exclusions);
    if (thingsToCarry && typeof thingsToCarry === "string") thingsToCarry = JSON.parse(thingsToCarry);
    if (generalPolicy && typeof generalPolicy === "string") generalPolicy = JSON.parse(generalPolicy);
    if (cancellationPolicy && typeof cancellationPolicy === "string") cancellationPolicy = JSON.parse(cancellationPolicy);
    if (faqs && typeof faqs === "string") faqs = JSON.parse(faqs);
    if (batches && typeof batches === "string") batches = JSON.parse(batches);
    if (existingGallery && typeof existingGallery === "string") existingGallery = JSON.parse(existingGallery);
  } catch (error) {
    return next(new CustomError("Invalid JSON format in update data", 400));
  }

  // 3. Handle Slug Change (if title is updated)
  let updatedSlug = trip.slug;
  if (title && title.trim() !== trip.title) {
    updatedSlug = slugify(title, { lower: true, strict: true, trim: true });
    
    // Check for duplicate slug in OTHER trips
    const slugConflict = await Trip.findOne({ slug: updatedSlug, _id: { $ne: id } });
    if (slugConflict) {
      return next(new CustomError("Another trip with this title already exists", 400));
    }
  }

  // 4. Group Uploaded Files
  const groupedFiles = {};
  (req.files || []).forEach((file) => {
    if (!groupedFiles[file.fieldname]) {
      groupedFiles[file.fieldname] = [];
    }
    groupedFiles[file.fieldname].push(file);
  });

  // 5. Handle Gallery Update
  let finalGallery = existingGallery || []; // Start with images the user kept
  if (groupedFiles.gallery?.length) {
    const newGalleryImages = await uploadFileToCloudinary(
      groupedFiles.gallery,
      "trips/gallery"
    );
    finalGallery = [...finalGallery, ...newGalleryImages];
  }

  // Enforce Max 12 Images limit
  if (finalGallery.length > 12) {
    return next(new CustomError("Total gallery images cannot exceed 12", 400));
  }

  // 6. Handle Itinerary Update & Images
  if (itinerary && Array.isArray(itinerary)) {
    for (let i = 0; i < itinerary.length; i++) {
      const fieldName = `dayImages_${i}`;
      
      // If new images were uploaded for this specific day
      if (groupedFiles[fieldName]?.length) {
        const newlyUploadedDayImages = await uploadFileToCloudinary(
          groupedFiles[fieldName],
          "trips/itinerary"
        );
        
        // Merge with existing images for this day (if any sent in the day object)
        const currentDayImages = itinerary[i].dayImages || [];
        itinerary[i].dayImages = [...currentDayImages, ...newlyUploadedDayImages];
      }

      // Validation for itinerary title
      if (!itinerary[i].title?.trim()) {
        return next(new CustomError(`Title missing for itinerary day ${i + 1}`, 400));
      }
      // Ensure day numbers are correct (1, 2, 3...)
      itinerary[i].dayNumber = i + 1;
    }
  }

  // 7. Validate Batches
  if (batches && Array.isArray(batches)) {
    batches.forEach((batch, idx) => {
      const start = new Date(batch.startDate);
      const end = new Date(batch.endDate);
      if (end <= start) {
        throw new CustomError(`Batch ${idx + 1}: End date must be after start date`, 400);
      }
      if (Number(batch.pricePerPerson) <= 0) {
        throw new CustomError(`Batch ${idx + 1}: Price must be positive`, 400);
      }
    });
  }

  // 8. Construct Update Object
  const updateData = {
    title: title || trip.title,
    slug: updatedSlug,
    summary: summary || trip.summary,
    aboutTrip: aboutTrip || trip.aboutTrip,
    highlights: highlights || trip.highlights,
    itinerary: itinerary || trip.itinerary,
    inclusions: inclusions || trip.inclusions,
    exclusions: exclusions || trip.exclusions,
    thingsToCarry: thingsToCarry || trip.thingsToCarry,
    generalPolicy: generalPolicy || trip.generalPolicy,
    cancellationPolicy: cancellationPolicy || trip.cancellationPolicy,
    faqs: faqs || trip.faqs,
    batches: batches || trip.batches,
    gallery: finalGallery,
  };

  // 9. Update Database Record
  const updatedTrip = await Trip.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // 10. Final Response
  res.status(200).json({
    success: true,
    message: "Trip updated successfully",
    data: updatedTrip,
  });
})




export const handleTripEnquiry = asyncHandler(async (req, res, next) => {
  const { 
    tripId, 
    batchId, 
    name, 
    email, 
    phone, 
    guests, 
    message 
  } = req.body;

  // 1. Validation
  if (!tripId || !name || !email || !phone || !guests) {
    return next(new CustomError("All fields are required", 400));
  }

  // 2. Get Trip and Batch Details
  const trip = await Trip.findById(tripId);
  if (!trip) return next(new CustomError("Trip not found", 404));

  const batch = trip.batches.id(batchId);
  if (!batch) return next(new CustomError("Selected batch not found", 404));

  // 3. Fetch Admin Settings for the receiver email
  const settings = await PlatformSettings.findOne();
  const adminEmail = settings?.supportEmail || "bonfireescapes@gmail.com";

  // 4. Trigger Emails
  await sendTripEnquiryEmail({
    adminEmail,
    customerData: { name, email, phone, guests, message },
    tripData: { title: trip.title, slug: trip.slug },
    batchData: { 
      startDate: batch.startDate, 
      endDate: batch.endDate, 
      pricePerPerson: batch.pricePerPerson 
    }
  });

  res.status(200).json({
    success: true,
    message: "Enquiry sent successfully. Our team will contact you soon."
  });
});