import nodemailer from "nodemailer";
import CustomError from "../error/customError.js";
import dotenv from "dotenv";

// import dotenv from "dotenv";
dotenv.config();

// configDotenv();

// console.log("🎀", process.env.NODEMAILER_EMAIL_USER),
//   console.log("🎀", process.env.NODEMAILER_EMAIL_PASS);

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

// utils/mailer/sendMail.js
export const sendSupportMail = async ({ from, to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log("📧 Admin mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Mail sending failed:", error);
    throw new Error(error.message);
  }
};


export const supportMailToAdmin = async ({ customerEmail, message }) => {
  const subject = "📩 New Support Email from Customer";

  const html = `
  <div style="background-color:#f4f6f8;padding:30px;">
    <div style="
      max-width:600px;
      margin:auto;
      background:#ffffff;
      border-radius:8px;
      overflow:hidden;
      box-shadow:0 4px 12px rgba(0,0,0,0.08);
      font-family: Arial, Helvetica, sans-serif;
    ">

      <!-- Header -->
      <div style="background:#ff7a18;padding:16px 24px;">
        <h2 style="margin:0;color:#ffffff;font-size:20px;">
          📩 New Support Request
        </h2>
      </div>

      <!-- Body -->
      <div style="padding:24px;color:#333333;">
        <p style="margin:0 0 12px;">
          A new support request has been received.
        </p>

        <div style="
          background:#f9fafb;
          padding:12px 16px;
          border-radius:6px;
          margin-bottom:20px;
          font-size:14px;
        ">
          <p style="margin:0;">
            <strong>Customer Email:</strong><br/>
            <span style="color:#ff7a18;">${customerEmail}</span>
          </p>
        </div>

        <p style="font-weight:bold;margin-bottom:6px;">
          Message:
        </p>

        <div style="
          border:1px solid #e5e7eb;
          border-radius:6px;
          padding:14px;
          background:#ffffff;
          font-size:14px;
          line-height:1.6;
          white-space:pre-line;
        ">
          ${message}
        </div>
      </div>

      <!-- Footer -->
      <div style="
        background:#f1f5f9;
        padding:14px 24px;
        font-size:12px;
        color:#6b7280;
        text-align:center;
      ">
        © ${new Date().getFullYear()} Support System · All rights reserved
      </div>

    </div>
  </div>
`;


  return sendSupportMail({
    from:customerEmail,
    to:process.env.NODEMAILER_EMAIL_USER, // 👈 ADMIN RECEIVES
    subject,
    html,
  });
};



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
