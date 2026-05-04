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
/*                       Support Mail (Reusable)  send to both sender and reciever                            */
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


/* -------------------------------------------------------------------------- */
/*                 SUB ADMIN ACCOUNT CREATED (WITH PASSWORD)                   */
/* -------------------------------------------------------------------------- */
export const sendSubAdminCreatedEmail = async (
  name,
  email,
  Password
) => {
  const subject = "Your Bonfire Sub-Admin Account Details";

  const html = `
  <div style="background:#f4f6f8;padding:40px 0;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td style="background:#111827;padding:20px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;">Bonfire 🔥</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px;color:#111827;">
                <h2>Hello ${name},</h2>

                <p>
                  Your <strong>Sub-Admin account</strong> has been successfully created on
                  <strong>Bonfire</strong>.
                </p>

                <p>You can log in using the credentials below:</p>

                <table width="100%" cellpadding="10" cellspacing="0" style="background:#f9fafb;border-radius:6px;">
                  <tr>
                    <td><strong>Email</strong></td>
                    <td>${email}</td>
                  </tr>
                  <tr>
                    <td><strong>Temporary Password</strong></td>
                    <td>${Password}</td>
                  </tr>
                </table>

                <p style="margin-top:20px;color:#b91c1c;">
                  ⚠️ For security reasons, please change your password immediately after logging in.
                </p>

                <p>
                  If you were not expecting this email, please contact the administrator immediately.
                </p>

                <p style="margin-top:30px;">
                  Best regards,<br/>
                  <strong>Team Bonfire</strong>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} Bonfire. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
  `;

  return sendEmail(email, subject, html);
};
