import express from "express";
import multer from "multer";
import { protect } from "../middleware/auth/auth.middleware.js";
import {
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  getUserProfileById,
} from "../controllers/user.controller.js";

const storage = multer.memoryStorage(); // or diskStorage
const upload = multer({ storage });

const router = express.Router();

router.post("/profile", protect, upload.array("images", 1), updateUserProfile);

router.get("/profile", protect, getUserProfile);
router.get("/all", protect, getAllUsers);

router.get("/profile/:userId", protect, getUserProfileById);

export default router;
