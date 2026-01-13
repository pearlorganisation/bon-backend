import Review from "../../models/Listing/review.model.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";
import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { validateFileSize } from "../../utils/validateFileSize.js";
import {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} from "../../utils/cloudinary.js";

// @desc    Create a new review
// @route   POST /api/reviews/:propertyId/:roomId
export const createReview = asyncHandler(async (req, res, next) => {

  const { propertyId, roomId } = req.params;

  const userId = req.user._id;
  
  const { rating, comment } = req.body;

  // 1. Check if Property and Room exist
  const property = await Property.findById(propertyId);
  const room = await Room.findById(roomId);

  if (!property || !room) {
    return next(new CustomError("Property or Room not found", 404));
  }

  // 2. Validate Rating
  if (!rating || rating < 1 || rating > 5) {
    return next(new CustomError("Rating must be between 1 and 5", 400));
  }

  // 3. Handle Image Uploads
  let uploadedImages = [];
  if (req.files?.images) {
    const errMsg = validateFileSize(req.files.images, "image");
    if (errMsg) return next(new CustomError(errMsg, 400));

    uploadedImages = await uploadFileToCloudinary(
      req.files.images,
      "reviews/images"
    );
  }

  // 4. Create Review
  const review = await Review.create({
    userId,
    propertyId,
    roomId,
    rating: Number(rating),
    comment,
    images: uploadedImages,
  });

  return successResponse(res, 201, "Review submitted successfully", review);
});

// @desc    Get All Reviews (Admin or General Feed)
// @route   GET /api/reviews/all
export const getAllReviews = asyncHandler(async (req, res, next) => {
  // Optional: Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find()
    .populate("userId", "name avatar email") // Populate user details
    .populate("propertyId", "name")
    .populate("roomId", "name type")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments();

  return successResponse(res, 200, "All reviews fetched successfully", {
    reviews,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// @desc    Get Reviews by Property
// @route   GET /api/reviews/property/:propertyId
export const getReviewsByProperty = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;

  const reviews = await Review.find({ propertyId })
    .populate("userId", "name avatar") // Only show name and avatar for privacy
    .populate("roomId", "name type") // Show which room they stayed in
    .sort({ createdAt: -1 }); // Newest first

  // Calculate quick stats for response
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((acc, item) => acc + item.rating, 0) / totalReviews
      : 0;

  return successResponse(res, 200, "Property reviews fetched successfully", {
    stats: {
      totalReviews,
      averageRating: avgRating.toFixed(1),
    },
    reviews,
  });
});

// @desc    Get Reviews by Room (Specific Room Type)
// @route   GET /api/reviews/room/:roomId
export const getReviewsByRoom = asyncHandler(async (req, res, next) => {
  const { roomId } = req.params;

  const reviews = await Review.find({ roomId })
    .populate("userId", "name avatar")
    .sort({ createdAt: -1 });

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((acc, item) => acc + item.rating, 0) / totalReviews
      : 0;

  return successResponse(res, 200, "Room reviews fetched successfully", {
    stats: {
      totalReviews,
      averageRating: avgRating.toFixed(1),
    },
    reviews,
  });
});

// @desc    Delete Review
// @route   DELETE /api/reviews/:reviewId
// export const deleteReview = asyncHandler(async (req, res, next) => {
//   const { reviewId } = req.params;
//   const userId = req.user._id;

//   const review = await Review.findById(reviewId);

//   if (!review) {
//     return next(new CustomError("Review not found", 404));
//   }

//   // Allow deletion if user owns the review OR if user is an Admin (add admin check if needed)
//   if (review.userId.toString() !== userId.toString()) {
//     // You might also check if req.user.role === 'admin' here
//     return next(
//       new CustomError("You are not authorized to delete this review", 403)
//     );
//   }

//   // Delete images from Cloudinary
//   if (review.images && review.images.length > 0) {
//     for (const img of review.images) {
//       await deleteFileFromCloudinary(img.public_id, "image");
//     }
//   }

//   await Review.findByIdAndDelete(reviewId);

//   return successResponse(res, 200, "Review deleted successfully", {});
// });

export const deleteReview = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;
  const { _id: userId, role } = req.user;

  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new CustomError("Review not found", 404));
  }

  // ✅ Authorization logic
  const isOwner = review.userId.toString() === userId.toString();
  const isAdmin = role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return next(
      new CustomError("You are not authorized to delete this review", 403)
    );
  }

  // 🖼️ Delete images from Cloudinary
  if (review.images?.length > 0) {
    for (const img of review.images) {
      await deleteFileFromCloudinary(img.public_id, "image");
    }
  }

  await Review.findByIdAndDelete(reviewId);

  return successResponse(res, 200, "Review deleted successfully", {});
});
