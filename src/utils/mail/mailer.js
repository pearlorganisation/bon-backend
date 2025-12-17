import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                            Nodemailer Transporter                           */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                         Support Mail (Reusable)                             */
/* -------------------------------------------------------------------------- */
export const sendSupportMail = async ({
  from,
  to,
  subject,
  html,
  replyTo,
  cc, 
}) => {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo, // ✅ allows admin to reply to customer
      cc
    });

    console.log("📧 Support mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Support mail failed:", error);
    throw new Error(error.message);
  }
};

/* -------------------------------------------------------------------------- */
/*                      Support Email → Admin                                  */
/* -------------------------------------------------------------------------- */
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

        <div style="background:#ff7a18;padding:16px 24px;">
          <h2 style="margin:0;color:#ffffff;font-size:20px;">
            📩 New Support Request
          </h2>
        </div>

        <div style="padding:24px;color:#333333;">
          <p>A new support request has been received.</p>

          <div style="background:#f9fafb;padding:12px;border-radius:6px;">
            <strong>Customer Email:</strong><br/>
            <span style="color:#ff7a18;">${customerEmail}</span>
          </div>

          <p style="margin-top:16px;font-weight:bold;">Message:</p>

          <div style="
            border:1px solid #e5e7eb;
            border-radius:6px;
            padding:14px;
            background:#ffffff;
            line-height:1.6;
            white-space:pre-line;
          ">
            ${message}
          </div>
        </div>

        <div style="background:#f1f5f9;padding:14px;text-align:center;font-size:12px;">
          © ${new Date().getFullYear()} Support System · All rights reserved
        </div>
      </div>
    </div>
  `;

  return sendSupportMail({
    from:`"Support System" <${process.env.NODEMAILER_EMAIL_USER}>`, // ADMIN sender
    to: process.env.NODEMAILER_EMAIL_USER, // ADMIN receives
    replyTo: customerEmail, // ✅ reply goes to customer
    subject,
    html,
    cc: customerEmail,
  });
};

/* -------------------------------------------------------------------------- */
/*                           Generic Email Sender                              */
/* -------------------------------------------------------------------------- */
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
    throw new Error(error.message);
  }
};

/* -------------------------------------------------------------------------- */
/*                               OTP Email                                     */
/* -------------------------------------------------------------------------- */
export const sendOtpEmail = async (name, email, otp, type = "REGISTER") => {
  const subject =
    type === "REGISTER"
      ? "Verify your email"
      : "Password reset verification code";

  const html = `
    <div style="font-family:Arial;padding:20px;">
      <h2>Hi ${name},</h2>
      <p>Your ${
        type === "REGISTER" ? "registration" : "password reset"
      } OTP is:</p>
      <h1 style="letter-spacing:5px;color:#4F46E5;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
      <p style="font-size:12px;color:#666;">
        If you didn’t request this, please ignore this email.
      </p>
      <br/>
      <p>Best regards,<br/>Team Bonfire</p>
    </div>
  `;

  return sendEmail(email, subject, html);
};
