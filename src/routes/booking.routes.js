import express from "express";
import {
  createBooking,
  updateBooking,
  cancelBooking,
  createRazorpayOrder,
  getMyBooking,
} from "../controllers/Booking/booking.controller.js";

// Middleware to check authentication and roles (Placeholder names)df
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

router.get("/my-bookings", protect, authorizeRoles("CUSTOMER"), getMyBooking);

export default router;
