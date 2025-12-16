// src/modules/supportEmail/supportEmail.controller.js
import asyncHandler from "../../../middleware/asyncHandler.js";
import CustomError from "../../../utils/error/customError.js";
import successResponse from "../../../utils/error/successResponse.js";
import { sendEmail } from "../../../utils/mail/mailer.js";
import SupportEmail from "./supportEmail.model.js";

/**
 * Send support email
 */
export const sendSupportEmail = asyncHandler(async (req, res, next) => {
  const { email, message } = req.body;

  // 1️⃣ Validate input
  if (!email || !message) {
    throw new CustomError("Email and message are required", 400);
  }

  // 2️⃣ Save to DB
  const supportEmail = await SupportEmail.create({
    userId: req.user?._id,
    email,
    message,
  });

  // 3️⃣ Admin email (receiver)
  const adminEmail = process.env.NODEMAILER_EMAIL_USER;
  if (!adminEmail) {
    throw new CustomError("Admin email not configured", 500);
  }

  // 4️⃣ Email subject & HTML
  const subject = "New Support Message";
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>📩 New Support Message</h2>
      <p><strong>From:</strong> ${email}</p>
      <hr />
      <p>${message}</p>
      <br/>
      <p style="font-size:12px;color:#666">
        This message was sent from Email Support form.
      </p>
    </div>
  `;

  // 5️⃣ Send email
  await sendEmail(adminEmail, subject, html);

  // 6️⃣ Success response
  return successResponse(res, 200, "Message sent successfully. Our team will contact you soon.", supportEmail);
});

/**
 * Update the status of a support email
 */
export const updateEmailStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, handledBy } = req.body;

  // Validate status
  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!validStatuses.includes(status)) {
    throw new CustomError("Invalid status value", 400);
  }

  // Update email status
  const updatedEmail = await SupportEmail.findByIdAndUpdate(
    id,
    { status, handledBy },
    { new: true }
  );

  if (!updatedEmail) {
    throw new CustomError("Support email not found", 404);
  }

  return successResponse(res, 200, "Email status updated successfully", updatedEmail);
});

/**
 * Get all support emails
 */
export const getAllEmails = asyncHandler(async (req, res, next) => {
  const emails = await SupportEmail.find()
    .populate("userId", "name email")       // optional, include user info
    .populate("handledBy", "name email")   // optional, include handler info
    .sort({ createdAt: -1 });              // latest first

  return successResponse(res, 200, "Support emails fetched successfully", emails);
});
