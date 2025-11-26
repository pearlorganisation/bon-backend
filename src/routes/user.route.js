import express from "express";
import multer from "multer";
import { protect } from "../middleware/auth/auth.middleware.js";
import {
  updateUserProfile,
  getUserProfile,
} from "../controllers/user.controller.js";

const storage = multer.memoryStorage(); // or diskStorage
const upload = multer({ storage });

const router = express.Router();

router.post("/profile", protect, upload.array("images", 1), updateUserProfile);

router.get("/profile", protect, getUserProfile);

export default router;
