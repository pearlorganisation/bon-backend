import nodemailer from "nodemailer";
import CustomError from "../error/customError.js";
import dotenv from "dotenv";

// import dotenv from "dotenv";
dotenv.config();

// configDotenv();

console.log("🎀", process.env.NODEMAILER_EMAIL_USER),
  console.log("🎀", process.env.NODEMAILER_EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  service: "gmail",

  auth: {
    user: process.env.NODEMAILER_EMAIL_USER,
    pass: process.env.NODEMAILER_EMAIL_PASS,
  },
});

/**
 * Generic email sender
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Bornfire" <${process.env.NODEMAILER_EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("emailllll🎀", info);

    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    // We throw a normal Error here so the controller catches it
    throw new Error(error.message);
  }
};

/**
 * Send OTP Email
 */
export const sendOtpEmail = async (name, email, otp, type = "REGISTER") => {
  const subject =
    type === "REGISTER"
      ? "Verify your email "
      : "Password reset verification code";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2>Hi ${name},</h2>
      <p>Your ${
        type === "REGISTER" ? "registration" : "password reset"
      } OTP is:</p>
      <h1 style="letter-spacing: 5px; color: #4F46E5; font-size: 32px;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
      <p style="font-size: 12px; color: #666;">If you didn’t request this, please ignore this email.</p>
      <br/>
      <p>Best regards,<br/>Team Bonfire</p>
    </div>
  `;

  return await sendEmail(email, subject, html);
};
