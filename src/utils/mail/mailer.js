import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
/* -------------------------------------------------------------------------- */
/*                            Nodemailer Transporter                           */
/* -------------------------------------------------------------------------- */
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false,
//   service: "gmail",
//   auth: {
//     user: process.env.NODEMAILER_EMAIL_USER,
//     pass: process.env.NODEMAILER_EMAIL_PASS,
//   },
// });

// /* -------------------------------------------------------------------------- */
// /*                       Support Mail (Reusable)  send to both sender and reciever                            */
// /* -------------------------------------------------------------------------- */
// export const sendSupportMail = async ({
//   from,
//   to,
//   subject,
//   html,
//   replyTo,
//   cc,
// }) => {
//   try {
//     const info = await transporter.sendMail({
//       from,
//       to,
//       subject,
//       html,
//       replyTo, // ✅ allows admin to reply to customer
//       cc
//     });

//     console.log("📧 Support mail sent:", info.messageId);
//     return info;
//   } catch (error) {
//     console.error("❌ Support mail failed:", error);
//     throw new Error(error.message);
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                           Generic Email Sender                              */
// /* -------------------------------------------------------------------------- */
// export const sendEmail = async (to, subject, html) => {
//   try {
//     const info = await transporter.sendMail({
//       from: `"Bornfire" <${process.env.NODEMAILER_EMAIL_USER}>`,
//       to,
//       subject,
//       html,
//     });

//     console.log("📧 Email sent:", info.messageId);
//     return info;
//   } catch (error) {
//     console.error("❌ Email sending failed:", error);
//     throw new Error(error.message);
//   }
// };

import { Resend } from "resend";

// const resend = new Resend("re_aDxZxdy1_7eYcegWS17Dvg2aXFAsQYcVD");
// const RESEND_FROM_EMAIL = "rohit-singh@pearlorganisation.com";

// export const sendSupportMail = async ({
//   from,
//   to,
//   subject,
//   html,
//   replyTo,
//   cc,
// }) => {
//   try {
//     const response = await resend.emails.send({
//       from: from || `"Bonfire" <${RESEND_FROM_EMAIL}>`,
//       to,
//       cc,
//       reply_to: replyTo,
//       subject,
//       html,
//     });

//     console.log("📧 Support mail sent:", response.id);
//     return response;
//   } catch (error) {
//     console.error("❌ Support mail failed:", error);
//     throw new Error(error.message);
//   }
// };

// export const sendEmail = async (to, subject, html) => {
//   try {
//     const response = await resend.emails.send({
//       from: `"Bonfire" <${RESEND_FROM_EMAIL}>`,
//       to,
//       subject,
//       html,
//     });

//     console.log("📧 Email sent:", response.id);
//     return response;
//   } catch (error) {
//     console.error("❌ Email sending failed:", error);
//     throw new Error(error.message);
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                               OTP Email                                     */
// /* -------------------------------------------------------------------------- */
// export const sendOtpEmail = async (name, email, otp, type = "REGISTER") => {
//   const subject =
//     type === "REGISTER"
//       ? "Verify your email"
//       : "Password reset verification code";

//   const html = `
//     <div style="font-family:Arial;padding:20px;">
//       <h2>Hi ${name},</h2>
//       <p>Your ${
//         type === "REGISTER" ? "registration" : "password reset"
//       } OTP is:</p>
//       <h1 style="letter-spacing:5px;color:#4F46E5;">${otp}</h1>
//       <p>This OTP is valid for 5 minutes.</p>
//       <p style="font-size:12px;color:#666;">
//         If you didn’t request this, please ignore this email.
//       </p>
//       <br/>
//       <p>Best regards,<br/>Team Bonfire</p>
//     </div>
//   `;

//   return sendEmail(email, subject, html);
// };

import sgMail from "@sendgrid/mail";

// set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDGRID_FROM_EMAIL = "rohit-singh@pearlorganisation.com";

// Support Mail
export const sendSupportMail = async ({
  from,
  to,
  subject,
  html,
  replyTo,
  cc,
}) => {
  try {
    const msg = {
      to,
      from: `"Bonfire" <${SENDGRID_FROM_EMAIL}>`,
      subject,
      html,
      cc,
      replyTo,
    };

    const response = await sgMail.send(msg);

    console.log("📧 Support mail sent:", response[0].headers["x-message-id"]);
    return response;
  } catch (error) {
    console.error(
      "❌ Support mail failed:",
      error.response?.body || error.message
    );
    throw new Error(error.message);
  }
};

// Simple Email
export const sendEmail = async (to, subject, html) => {
  try {
    const msg = {
      to,
      from: `"Bonfire" <${SENDGRID_FROM_EMAIL}>`,
      subject,
      html,
    };

    const response = await sgMail.send(msg);

    console.log("📧 Email sent:", response[0].headers["x-message-id"]);
    return response;
  } catch (error) {
    console.error(
      "❌ Email sending failed:",
      error.response?.body || error.message
    );
    throw new Error(error.message);
  }
};
