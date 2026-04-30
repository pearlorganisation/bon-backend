
import crypto from "crypto";
import CustomError from "../utils/error/customError.js";
import { bookingWebhookController } from "../controllers/Booking/booking.controller.js";
import { subscriptionWebhookController } from "../controllers/partner/parnter.controller.js";
import { getRazorpayInstance } from "../config/razorpayConfig.js";


export const verifyRazorpaySignature = async(req, res, next) => {
  //const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    return next(new CustomError("Missing Razorpay signature", 400));
  }

    const { webhookSecret } = await getRazorpayInstance();

  if (!webhookSecret) {
    console.error("Webhook secret missing");
    return res.status(200).json({ success: true });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body) // RAW BUFFER
    .digest("hex");

  if (expectedSignature !== signature) {
    return next(new CustomError("Invalid Razorpay signature", 400));
  }

  // Safe parse once
  //  Parse event safely
  let event;
  try {
   event= JSON.parse(req.body.toString());
  } catch (err) {
    return next(new CustomError("Invalid webhook payload", 400));
  }

  let payment =event?.payload?.payment?.entity;
    req.razorpay = {
      eventType: event.event,
      paymentEntity: payment,
      orderId: payment?.order_id,
      paymentId: payment?.id,
      purpose: payment.notes?.purpose || "UNKNOWN",
    };

  next();
};


export const razorpayWebhookRouter = async (req, res, next) => {
  const { purpose } = req.razorpay;
  console.log("route->",req.razorpay);

  if (purpose === "BOOKING") {
    return bookingWebhookController(req, res, next);
  }

  if (purpose === "SUBSCRIPTION") {
    return subscriptionWebhookController(req, res, next);
  }

  // Unknown / ignored event
  return res.status(200).json({
    success: true,
    message: "Webhook ignored",
  });
};