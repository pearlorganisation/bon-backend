import express from "express";

import {
  register,
  login,
  verifyOtp,
  logout,
  refreshToken,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../../controllers/auth/auth.controller.js";
import { protect, authorizeRoles } from "../../middleware/auth/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/logout", protect, logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/test", protect,authorizeRoles("ADMIN"), (req, res) => {
  res.status(200).json({ message: "Protected route accessed!" });
});
export default router;
