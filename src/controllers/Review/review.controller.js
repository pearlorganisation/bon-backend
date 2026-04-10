import Review from "../../models/Listing/review.model.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";
import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import Booking from "../../models/Listing/booking.model.js";
import mongoose from "mongoose";

export const createReview = asyncHandler(async (req, res, next) => {
  const { bookingId, review, rooms } = req.body;
  const userId = req.user._id;

  /* ================= VALIDATION ================= */
  if (!bookingId || !rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return next(
      new CustomError("bookingId and rooms ratings are required", 400),
    );
  }

  /* ================= FETCH BOOKING ================= */
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new CustomError("Booking not found", 404));
  }

  /* ================= USER VALIDATION ================= */
  if (booking.userId.toString() !== userId.toString()) {
    return next(
      new CustomError("You are not allowed to review this booking", 403),
    );
  }

  /* ================= STATUS VALIDATION ================= */
  if (booking.status !== "checkIn") {
    return next(new CustomError("Review allowed only after check-in", 400));
  }

  if (booking.paymentStatus !== "paid") {
    return next(
      new CustomError("Payment must be completed to submit review", 400),
    );
  }

  /* ================= PREVENT DUPLICATE ================= */
  const existingReview = await Review.findOne({ bookingId });

  if (existingReview) {
    return next(new CustomError("You have already reviewed this booking", 400));
  }

  /* ================= ROOM VALIDATION ================= */
  const bookingRoomIds = booking.rooms.map((r) => r.roomId.toString());

  const validatedRooms = [];

  for (const r of rooms) {
    if (!r.roomId || r.rating === undefined) {
      return next(
        new CustomError("Each room must have roomId and rating", 400),
      );
    }

    if (!mongoose.Types.ObjectId.isValid(r.roomId)) {
      return next(new CustomError("Invalid roomId", 400));
    }

    if (!bookingRoomIds.includes(r.roomId.toString())) {
      return next(new CustomError("Room does not belong to this booking", 400));
    }

    if (r.rating < 1 || r.rating > 5) {
      return next(new CustomError("Rating must be between 1 and 5", 400));
    }

    validatedRooms.push({
      roomId: r.roomId,
      rating: r.rating,
    });
  }

  if (validatedRooms.length !== booking.rooms.length) {
    return next(new CustomError("You must review all booked rooms", 400));
  }

  /* ================= CREATE REVIEW ================= */
  const newReview = await Review.create({
    bookingId,
    propertyId: booking.propertyId,
    review,
    rooms: validatedRooms,
  });

  /* ================= RESPONSE ================= */
  successResponse(res, 201, "Review submitted successfully", {
    review: newReview,
  });
});

export const updateReview = asyncHandler(async (req, res, next) => {
  const { bookingId, review, rooms } = req.body;
  const userId = req.user._id;

  /* ================= VALIDATION ================= */
  if (!bookingId || !rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return next(
      new CustomError("bookingId and rooms ratings are required", 400),
    );
  }

  /* ================= FETCH REVIEW ================= */
  const existingReview = await Review.findOne({ bookingId });

  if (!existingReview) {
    return next(new CustomError("Review not found", 404));
  }

  /* ================= FETCH BOOKING ================= */
  const booking = await Booking.findById(bookingId);

  /* ================= USER VALIDATION ================= */
  if (booking.userId.toString() !== userId.toString()) {
    return next(
      new CustomError("You are not allowed to update this review", 403),
    );
  }

  const daysDiff =
    (Date.now() - new Date(existingReview.createdAt)) / (1000 * 60 * 60 * 24);

  if (daysDiff > 7) {
    return next(
      new CustomError("Review can only be updated within 7 days", 400),
    );
  }

  /* ================= ROOM VALIDATION ================= */
  const bookingRoomIds = booking.rooms.map((r) => r.roomId.toString());

  const validatedRooms = [];

  for (const r of rooms) {
    if (!r.roomId || r.rating === undefined) {
      return next(
        new CustomError("Each room must have roomId and rating", 400),
      );
    }

    if (!mongoose.Types.ObjectId.isValid(r.roomId)) {
      return next(new CustomError("Invalid roomId", 400));
    }

    if (!bookingRoomIds.includes(r.roomId.toString())) {
      return next(new CustomError("Room does not belong to this booking", 400));
    }

    if (r.rating < 1 || r.rating > 5) {
      return next(new CustomError("Rating must be between 1 and 5", 400));
    }

    validatedRooms.push({
      roomId: r.roomId,
      rating: r.rating,
    });
  }

  /* ================= OPTIONAL STRICT CHECK ================= */
  if (validatedRooms.length !== booking.rooms.length) {
    return next(new CustomError("You must review all booked rooms", 400));
  }

  /* ================= UPDATE REVIEW ================= */
  existingReview.review = review || existingReview.review;
  existingReview.rooms = validatedRooms;

  await existingReview.save(); // triggers pre-save (recalculate overallRating)

  /* ================= RESPONSE ================= */
  successResponse(res, 200, "Review updated successfully", {
    review: existingReview,
  });
});

// export const deleteReview = asyncHandler(async (req, res, next) => {

//   const { bookingId } = req.params; // better in params for delete
//   const userId = req.user._id;

//   /* ================= VALIDATION ================= */
//   if (!bookingId) {
//     return next(new CustomError("bookingId is required", 400));
//   }

//   /* ================= FETCH REVIEW ================= */
//   const review = await Review.findOne({ bookingId });

//   if (!review) {
//     return next(new CustomError("Review not found", 404));
//   }

//   /* ================= FETCH BOOKING ================= */
//   const booking = await Booking.findById(bookingId);

//   if (!booking) {
//     return next(new CustomError("Booking not found", 404));
//   }

//   /* ================= USER VALIDATION ================= */
//   if (booking.userId.toString() !== userId.toString()) {
//     return next(
//       new CustomError("You are not allowed to delete this review", 403)
//     );
//   }

//   /* ================= DELETE ================= */
//   await review.deleteOne();

//   /* ================= RESPONSE ================= */
//   successResponse(res, 200, "Review deleted successfully", {});
// });

export const getPropertyReviews = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;

  const { page = 1, limit = 10 } = req.query;

  if (!propertyId) {
    return next(new CustomError("propertyId is required", 400));
  }

  const skip = (Number(page) - 1) * Number(limit);

  /* ================= AGGREGATE STATS ================= */
  const stats = await Review.aggregate([
    {
      $match: {
        propertyId: new mongoose.Types.ObjectId(propertyId),
      },
    },
    {
      $group: {
        _id: "$propertyId",
        avgRating: { $avg: "$overallRating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const avgRating = stats[0]?.avgRating || 0;
  const totalReviews = stats[0]?.totalReviews || 0;

  /* ================= FETCH REVIEWS ================= */
  const reviews = await Review.find({ propertyId })
    .populate({
      path: "bookingId",
      populate: {
        path: "userId",
        select: "name email", // fields from user
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Review.countDocuments({ propertyId });

  /* ================= RESPONSE ================= */
  successResponse(res, 200, "Property reviews fetched successfully", {
    avgRating: Number(avgRating.toFixed(1)), // rounded
    totalReviews,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
    reviews,
  });
});
