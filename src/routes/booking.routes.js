import express from "express";
import {
  createBooking,
  updateBooking,
  cancelBooking,
  createRazorpayOrder,
  selectPayOnArrivalMode,
  getMyBooking,
  getBooking,
} from "../controllers/Booking/booking.controller.js";

// Middleware to check authentication and roles (Placeholder names)df
import { authorizeRoles, protect } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, authorizeRoles("CUSTOMER"), createBooking);
router.post(
  "/update/:bookingId",
  protect,
  authorizeRoles("CUSTOMER"),
  updateBooking,
);
router.post(
  "/pay-on-arrival/:bookingId",
  protect,
  authorizeRoles("CUSTOMER"),
  selectPayOnArrivalMode,
);
router.post(
  "/create-order/:bookingId",
  protect,
  authorizeRoles("CUSTOMER"),
  createRazorpayOrder,
);
router.post(
  "/cancel/:bookingId",
  protect,
  authorizeRoles("CUSTOMER", "PARTNER"),
  cancelBooking,
);
//df
router.get("/my-bookings", protect, authorizeRoles("CUSTOMER"), getMyBooking);

router.get("/", protect, authorizeRoles("ADMIN", "PARTNER"), getBooking);

export default router;
