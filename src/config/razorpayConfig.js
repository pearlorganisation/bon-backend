import Razorpay from "razorpay";
import dotenv from "dotenv";
import CustomError from "../utils/error/customError.js";
import Admin from "../models/Admin/admin.model.js";


export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export const getRazorpayInstance = async () => {
  //  Get admin config
  const admin = await Admin.findOne().lean();

  if (!admin || !admin.RAZORPAY_CONFIG) {
    throw new CustomError("Razorpay config not found", 404);
  }

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } =
    admin.RAZORPAY_CONFIG;

  //  Validate required keys
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new CustomError("Invalid Razorpay credentials", 400);
  }

  //  Create instance
  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  //  Return everything needed
  return {
    razorpay,
    webhookSecret: RAZORPAY_WEBHOOK_SECRET || null,
  };
};