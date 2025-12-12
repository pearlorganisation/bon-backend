import express from "express";
import {
  createReview,
  getAllReviews,
  getReviewsByProperty,
  getReviewsByRoom,
  deleteReview,
} from "../controllers/Review/review.controller.js";

import multer from "multer";
import { protect } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });
const uploadImages = upload.fields([{ name: "images", maxCount: 5 }]);

// ================= ROUTES =================

// Create a review (Requires Login)
router.post("/create/:propertyId/:roomId", protect, uploadImages, createReview);

// Get All Reviews (Public or Admin)
router.get("/all", getAllReviews);

// Get Reviews specific to a Property (Public)
router.get("/property/:propertyId", getReviewsByProperty);

// Get Reviews specific to a Room (Public)
router.get("/room/:roomId", getReviewsByRoom);

// Delete a review (Requires Login)
router.delete("/delete/:reviewId", protect, deleteReview);

export default router;
