import express from "express";
import multer from "multer";
import { protect, isAdmin } from "../middleware/auth/auth.middleware.js";
import {
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  getUserProfileById,
  deleteAllUsers,
  updateAllUsers,
} from "../controllers/user.controller.js";

const storage = multer.memoryStorage(); // or diskStorage
const upload = multer({ storage });

const router = express.Router();

router.post("/profile", protect, upload.array("images", 1), updateUserProfile);

router.get("/profile", protect, getUserProfile);
router.get("/all", protect, getAllUsers);
router.put(
  "/users/:id",
  protect,
  isAdmin,
  upload.array("images", 1),
  updateAllUsers
);
router.delete("/users/:id", protect, isAdmin, deleteAllUsers);

router.get("/profile/:userId", protect, getUserProfileById);

export default router;
