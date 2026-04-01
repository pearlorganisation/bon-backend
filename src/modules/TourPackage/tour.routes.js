import express from "express";
import multer from "multer";

import {
  protect,
  authorizeRoles,
} from "../../middleware/auth/auth.middleware.js";
import {
  createTour,
  deleteTour,
  getAllTours,
  getTours,
  updateTour,
} from "./tour.controller.js";

const router = express.Router();

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =========================================================
   DOCUMENT (MASTER) ROUTES
========================================================= */

// Create document (Admin / Sub-Admin)
router.post(
  "/create",
  protect,
  authorizeRoles("ADMIN"),
  upload.single("image"),
  createTour
);

router.put(
  "/update/:id",
  protect,
  authorizeRoles("ADMIN"),
  upload.single("image"),
  updateTour
);
router.delete(
  "/delete/:id",
  protect,
  authorizeRoles("ADMIN"),
  deleteTour
);
router.get("/get-all-tour", protect, authorizeRoles("ADMIN"), getAllTours);

router.get("/get-active-tours", protect, authorizeRoles("ADMIN"), getTours);

export default router;
