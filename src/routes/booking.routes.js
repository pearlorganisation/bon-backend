import express from "express";
import {
  createBooking,
  updateBooking,
  cancelBooking,

} from "../controllers/Booking/booking.controller.js";

// Middleware to check authentication and roles (Placeholder names)
import { authorizeRoles, protect } from "../middleware/auth/auth.middleware.js";

const router = express.Router();


router.post("/create",protect,authorizeRoles("CUSTOMER"),createBooking);
router.post("/update", protect, authorizeRoles("CUSTOMER"), updateBooking);
router.post("/cancel/:id",protect, authorizeRoles("CUSTOMER"), cancelBooking);

export default router;
