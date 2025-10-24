import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
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
    trim: true,
    unique:true
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ⏱️ Automatically delete OTP after 5 minutes
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

// ✅ Fix typo here: was 'emailOtpSchem' → should be 'emailOtpSchema'
export const OTP = mongoose.model("OTP", OtpSchema);


