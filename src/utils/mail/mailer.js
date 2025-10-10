// src/utils/mailer.js
import nodemailer from "nodemailer";
import CustomError from "../error/customError.js";
import { configDotenv } from "dotenv";

configDotenv(); 
/**
 * Configure Nodemailer Transporter
 */

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  auth: {
    user: process.env.NODEMAILER_EMAIL_USER,
    pass: process.env.NODEMAILER_EMAIL_PASS,
  },
});

/**
 * Generic email sender
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Bornfire" <${process.env.NODEMAILER_EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new CustomError("Failed to send email", 500);
  }
};
/**
 * Send OTP Email
 * @param {string} name - Recipient name
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} type - REGISTER or FORGOT_PASSWORD
 */
export const sendOtpEmail = async (name, email, otp, type = "REGISTER") => {
  const subject =
    type === "REGISTER"
      ? "Verify your email "
      : "Password reset verification code";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333">
      <h2>Hi ${name},</h2>
      <p>Your ${
        type === "REGISTER" ? "registration" : "password reset"
      } OTP is:</p>
      <h1 style="letter-spacing: 2px;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
      <br/>
      <p>Best regards,<br/>Team Project Nature</p>
    </div>
  `;

  return await sendEmail(email, subject, html);
};
