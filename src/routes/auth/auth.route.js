import express from "express";

import { register, login, verifyOtp, logout,refreshToken,resendOtp } from "../../controllers/auth/auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";


const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/logout",protect, logout);
router.post("/refresh-token", refreshToken);
router.get("/test", protect, (req, res) => {
            res.status(200).json({ message: "Protected route accessed!" });
})
export default router;