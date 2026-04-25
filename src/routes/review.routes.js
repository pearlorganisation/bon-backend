import express from "express";
import {
  createReview,
  updateReview,
  getPropertyReviews,
} from "../controllers/Review/review.controller.js";

import { protect, authorizeRoles } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

// ================= ROUTES =================

// Create a review (Requires Login)
router.post("/create", protect, authorizeRoles("CUSTOMER"), createReview);

router.post("/update", protect, authorizeRoles("CUSTOMER"), updateReview);

// Get Reviews specific to a Property (Public)
router.get("/property/:propertyId", getPropertyReviews);

export default router;
