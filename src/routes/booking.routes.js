import express from "express";
import {
  createBooking,
  updateBooking,
  cancelBooking,
  createRazorpayOrder,
} from "../controllers/Booking/booking.controller.js";

// Middleware to check authentication and roles (Placeholder names)
import { authorizeRoles, protect } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, authorizeRoles("CUSTOMER"), createBooking);
router.post(
  "/update/:bookingId",
  protect,
  authorizeRoles("CUSTOMER"),
  updateBooking
);
router.post(
  "/create-order/:bookingId",
  protect,
  authorizeRoles("CUSTOMER"),
  createRazorpayOrder
);
router.post(
  "/cancel/:bookingId",
  protect,
  authorizeRoles("CUSTOMER"),
  cancelBooking
);

export default router;
