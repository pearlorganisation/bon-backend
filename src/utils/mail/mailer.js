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

// import { Resend } from "resend";

// const resend = new Resend("re_CX67wd6v_HK8NCs9LUsbxznVqiRbFVXoP");
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

/* -------------------------------------------------------------------------- */
/*                               OTP Email                                     */
/* -------------------------------------------------------------------------- */
export const sendOtpEmail = async (name, email, otp, type = "REGISTER") => {
  const subject = type === "REGISTER" ? "Verify your Email - Bonfire Escapes" : "Password Reset - Bonfire Escapes";
  
  // Brand color constant
  const brandColor = "#f05a28"; 

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <!-- Header with Logo -->
      <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid ${brandColor};">
        <img src="https://bonfireescapes.com/logoo.jpeg" alt="Bonfire Escapes" style="max-width: 150px;" />
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #333;">
        <h2 style="color: #333;">Hi ${name},</h2>
        <p>Thanks for choosing <strong>Bonfire Escapes</strong>. To complete your ${
          type === "REGISTER" ? "registration" : "password reset"
        }, please use the OTP below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="letter-spacing: 8px; color: ${brandColor}; font-size: 40px; margin: 0;">${otp}</h1>
        </div>
        
        <p style="font-size: 14px;">This code is valid for <strong>5 minutes</strong>. If you did not request this, please ignore this email or contact our support team.</p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9f9f9; padding: 20px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 5px 0;"><strong>Bonfire Escapes</strong></p>
        <p style="margin: 5px 0;">Dehradun, Uttarakhand, India | Rishikesh, India</p>
        <p style="margin: 5px 0;">Need help? <a href="mailto:support@bonfireescapes.com" style="color: ${brandColor};">support@bonfireescapes.com</a> | +91 9259682285</p>
        <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} Bonfire Escapes. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
};

/* -------------------------------------------------------------------------- */
/*                 SUB ADMIN ACCOUNT CREATED (WITH PASSWORD)                   */
/* -------------------------------------------------------------------------- */
export const sendSubAdminCreatedEmail = async (name, email, Password) => {
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


