import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema({
  otp: {
    type: String,
    required: [true, "OTP is a required field"],
  },
  type: {
    type: String,
    default: "REGISTER",
    enum: ["REGISTER", "FORGOT_PASSWORD"],
  },
  email: {
    type: String,
    required: [true, "Email is a required field"],
    lowercase: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ⏱️ Automatically delete OTP after 5 minutes
emailOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

// ✅ Fix typo here: was 'emailOtpSchem' → should be 'emailOtpSchema'
export const EOTP = mongoose.model("EOTP", emailOtpSchema);


