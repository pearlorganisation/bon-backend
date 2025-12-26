import express from "express";
import {
  createBooking,
  getMyBookings,
  getPartnerBookings,
  cancelBooking,
  getAllBookingsAdmin,
  getPartnerBookingByProperty,
  getBookingDetail,
  verifyPayment,
} from "../controllers/Booking/booking.controller.js";

// Middleware to check authentication and roles (Placeholder names)
import { authorizeRoles, protect } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

// User Routes
router.post("/book", protect, createBooking);
router.post("/verify", protect, verifyPayment);
router.get("/me", protect, getMyBookings);
router.put("/cancel/:bookingId", protect, cancelBooking);
router.get("/bookingDetail/:bookingId", protect, getBookingDetail);

router.get("/property/:propertyId", protect, getPartnerBookingByProperty);

// Partner Routes
router.get(
  "/partner/all",
  protect,
  authorizeRoles("PARTNER", "ADMIN"),
  getPartnerBookings
);

// Admin Routes
router.get(
  "/admin/all",
  protect,
  authorizeRoles("ADMIN", "SUBADMIN"),
  getAllBookingsAdmin
);

export default router;
