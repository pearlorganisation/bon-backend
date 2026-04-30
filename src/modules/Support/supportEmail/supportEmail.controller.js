// src/modules/supportEmail/supportEmail.controller.js
import asyncHandler from "../../../middleware/asyncHandler.js";
import CustomError from "../../../utils/error/customError.js";
import successResponse from "../../../utils/error/successResponse.js";
import { sendEmail } from "../../../utils/mail/mailer.js";
import SupportEmail from "./supportEmail.model.js";
import { supportMailToAdmin } from "../../../utils/mail/EmailTemplates/emailTemplate.js";

export const sendSupportEmail = asyncHandler(async (req, res) => {
  const { email, message } = req.body;

  // 1️⃣ Validate input
  if (!email || !message) {
    throw new CustomError("Email and message are required", 400);
  }

  // 2️⃣ Save in DB
  const supportEmail = await SupportEmail.create({
    userId: req.user?._id,
    email,
    message,
    status: "PENDING",
  });

  // 3️⃣ Send mail to ADMIN
  await supportMailToAdmin({
    customerEmail: email,
    message,
  });

  // 4️⃣ Success response
  return successResponse(
    res,
    200,
    "Your message has been sent to admin successfully",
    supportEmail
  );
});

// Update email status
export const updateEmailStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // 1️ Validate status
  const validStatuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "RESOLVED",
    "FAILED",
  ];

  if (!validStatuses.includes(status)) {
    throw new CustomError("Invalid email status", 400);
  }

  // 2️⃣ Prepare update object
  const updateData = {
    status,
  };

  // 3️⃣ Update timestamp only when COMPLETED
  if (status === "COMPLETED") {
    updateData.completedAt = new Date(); // or resolvedAt (your choice)
  }

  // 4️⃣ Update DB
  const updatedEmail = await SupportEmail.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  if (!updatedEmail) {
    throw new CustomError("Support email not found", 404);
  }

  // 5️⃣ Success response
  return successResponse(
    res,
    200,
    "Email status updated successfully",
    updatedEmail
  );
});

/**
 * Get all support emails
 */
export const getAllEmails = asyncHandler(async (req, res, next) => {
  const emails = await SupportEmail.find()
    .populate("userId", "name email") // optional, include user info
    .populate("handledBy", "name email") // optional, include handler info
    .sort({ createdAt: -1 }); // latest first

  return successResponse(
    res,
    200,
    "Support emails fetched successfully",
    emails
  );
});
