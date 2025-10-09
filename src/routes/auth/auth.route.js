import express from "express";

import { register, login, verifyOtp, logout,refreshToken } from "../../controllers/auth/auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";


const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/logout",protect, logout);
router.post("/refresh-token", refreshToken);

export default router;