import { sendEmail, sendSupportMail } from "../mailer.js";
import PlatformSettings from "../../../models/PlatformSettings/platformSettings.model.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("DB connected");

// 🎨 UI COLORS (Same as invoice design)
const COLORS = {
  primary: "#f97316",
  primaryDark: "#ea580c",
  primaryLight: "#fff7ed",
  textDark: "#1f2937",
  textLight: "#6b7280",
  success: "#22c55e",
  danger: "#ef4444",
  border: "#e5e7eb",
  white: "#ffffff",
  grayBg: "#f9fafb",
};

/* -------------------------------------------------------------------------- */
/*                          Get Platform Settings                             */
/* -------------------------------------------------------------------------- */
let platformSettingsCache = null;
let lastFetched = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getPlatformSettings = async () => {
  try {
    const now = Date.now();
    if (
      platformSettingsCache &&
      lastFetched &&
      now - lastFetched < CACHE_DURATION
    ) {
      return platformSettingsCache;
    }

    const settings = await PlatformSettings.findOne();
    platformSettingsCache = settings;
    lastFetched = now;
    return settings;
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                          Email Template Wrapper                            */
/* -------------------------------------------------------------------------- */

export const createEmailWrapper = async (content, title = "") => {
  const settings = await getPlatformSettings();

  // Get values from settings
  const websiteName = settings?.websiteName || "Bonfire Escapes";
  const supportEmail = settings?.supportEmail || null;
  const supportPhone = settings?.supportPhone || null;
  const copyrightText = settings?.copyrightText || null;

  // Get logo from PlatformSettings (not local file)
  const brandLogo = settings?.brandLogo?.url || null;

  // Build address only if fields exist
  const addressParts = [];
  if (settings?.addressLine1) addressParts.push(settings.addressLine1);
  if (settings?.addressLine2) addressParts.push(settings.addressLine2);
  const address = addressParts.length > 0 ? addressParts.join(", ") : null;

  const socialLinks = settings?.socialLinks || {};

  // Optimized HTML to prevent clipping
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px 16px !important; }
      .header { padding: 24px 16px !important; }
      .footer { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:20px 0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:550px;margin:0 auto;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px 20px;text-align:center;">
              ${
                brandLogo
                  ? `<img src="${brandLogo}" alt="${websiteName}" style="height:45px;width:auto;margin-bottom:12px;" />`
                  : '<div style="font-size:36px;"></div>'
              }
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">${websiteName}</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:6px 0 0;">Luxury Stays & Experiences</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:28px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 20px;text-align:center;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;">
              ${address ? `<p style="margin:0 0 8px;">📍 ${address}</p>` : ""}
              ${
                supportEmail
                  ? `<p style="margin:0 0 8px;">📧 <a href="mailto:${supportEmail}" style="color:#f97316;text-decoration:none;">${supportEmail}</a></p>`
                  : ""
              }
              ${
                supportPhone
                  ? `<p style="margin:0 0 8px;">📞 ${supportPhone}</p>`
                  : ""
              }
              ${
                copyrightText
                  ? `<p style="margin:12px 0 0;">${copyrightText}</p>`
                  : ""
              }
              <p style="margin:8px 0 0;font-size:10px;">This is an automated message, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
/* -------------------------------------------------------------------------- */
/*                          OTP Email Template                                */
/* -------------------------------------------------------------------------- */
export const sendOtpEmail = async (name, email, otp, type = "REGISTER") => {
  const subject =
    type === "REGISTER"
      ? "Verify Your Email Address"
      : "Password Reset Verification Code";

  const isRegister = type === "REGISTER";
  const instruction = isRegister
    ? "Please use the verification code below to complete your registration."
    : "Use the verification code below to reset your password. This code is valid for 5 minutes.";

  const content = `
    <div>
      <h2 style="color: ${
        COLORS.textDark
      }; font-size: 22px; font-weight: 600; margin: 0 0 8px 0;">
        Hello${name ? ` ${name}` : ""}! 👋
      </h2>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0 24px 0;">
        ${instruction}
      </p>

      <div style="background: ${COLORS.primaryLight}; border: 2px solid ${
    COLORS.primary
  }; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="color: ${
          COLORS.textLight
        }; font-size: 13px; margin: 0 0 12px 0; letter-spacing: 1px;">
          VERIFICATION CODE
        </p>
        <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: ${
          COLORS.primaryDark
        }; background: ${
    COLORS.white
  }; padding: 16px 24px; border-radius: 8px; display: inline-block; font-family: monospace;">
          ${otp}
        </div>
        <p style="color: ${
          COLORS.danger
        }; font-size: 12px; margin: 16px 0 0 0;">
          ⏰ This code will expire in 5 minutes
        </p>
      </div>

      <div style="background: ${
        COLORS.grayBg
      }; border-radius: 8px; padding: 16px; margin: 24px 0 0 0;">
        <p style="color: ${
          COLORS.textDark
        }; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
          🔒 Security Tips:
        </p>
        <ul style="color: ${
          COLORS.textLight
        }; font-size: 12px; margin: 0; padding-left: 20px;">
          <li style="margin: 4px 0;">Never share this OTP with anyone</li>
          <li style="margin: 4px 0;">Our team will never ask for your OTP</li>
          <li style="margin: 4px 0;">If you didn't request this, please ignore this email</li>
        </ul>
      </div>
    </div>
  `;

  const html = await createEmailWrapper(content, "Email Verification");
  return sendEmail(email, subject, html);
};

/* -------------------------------------------------------------------------- */
/*                          Welcome Email Template                            */
/* -------------------------------------------------------------------------- */
export const sendWelcomeEmail = async (name, email, role = "CUSTOMER") => {
  const subject = "Welcome to Bonfire Escapes! 🎉";

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">🎊</span>
      </div>
      
      <h2 style="color: ${
        COLORS.textDark
      }; font-size: 22px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
        Welcome aboard, ${name}!
      </h2>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0; text-align: center;">
        Thank you for joining us. We're thrilled to have you as our valued ${role.toLowerCase()}.
      </p>

      <div style="margin: 24px 0;">
        <div style="background: ${
          COLORS.primaryLight
        }; border-radius: 8px; padding: 20px; margin: 12px 0;">
          <h3 style="color: ${
            COLORS.primaryDark
          }; font-size: 16px; margin: 0 0 8px 0;">
            ✨ ${role === "PARTNER" ? "Partner Benefits" : "Guest Benefits"}
          </h3>
          <p style="color: ${COLORS.textLight}; font-size: 13px; margin: 0;">
            ${
              role === "PARTNER"
                ? "List your properties, manage bookings, and grow your business with our platform."
                : "Discover luxury stays, book unique properties, and create unforgettable memories with us!"
            }
          </p>
        </div>
      </div>

      <p style="color: ${
        COLORS.textLight
      }; font-size: 13px; margin: 24px 0 0 0;">
        We're here to help you every step of the way. Feel free to reach out if you have any questions!
      </p>

      <p style="color: ${
        COLORS.textDark
      }; font-size: 14px; margin: 24px 0 0 0;">
        Best regards,<br>
        <strong style="color: ${
          COLORS.primary
        };">Team Bonfire Escapes 🔥</strong>
      </p>
    </div>
  `;

  const html = await createEmailWrapper(content, "Welcome to Bonfire Escapes");
  return sendEmail(email, subject, html);
};

/* -------------------------------------------------------------------------- */
/*                          Password Reset Confirmation                       */
/* -------------------------------------------------------------------------- */
export const sendPasswordResetConfirmation = async (name, email) => {
  const subject = "Password Changed Successfully";

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">🔒</span>
      </div>
      
      <h2 style="color: ${COLORS.textDark}; font-size: 22px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
        Password Updated Successfully!
      </h2>
      
      <p style="color: ${COLORS.textLight}; font-size: 15px; line-height: 1.5; margin: 16px 0;">
        Hello ${name},
      </p>
      
      <p style="color: ${COLORS.textLight}; font-size: 15px; line-height: 1.5; margin: 16px 0;">
        Your password has been successfully changed. If you made this request, you can safely ignore this email.
      </p>

      <div style="background: ${COLORS.success}10; border-left: 4px solid ${COLORS.success}; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: ${COLORS.textDark}; font-size: 13px; margin: 0;">
          ✅ If you didn't make this change, please contact our support team immediately to secure your account.
        </p>
      </div>

      <p style="color: ${COLORS.textLight}; font-size: 13px; margin: 24px 0 0 0;">
        For security reasons, we recommend keeping your password secure and never sharing it with anyone.
      </p>

      <p style="color: ${COLORS.textDark}; font-size: 14px; margin: 24px 0 0 0;">
        Stay safe,<br>
        <strong style="color: ${COLORS.primary};">Team Bonfire Escapes 🔥</strong>
      </p>
    </div>
  `;

  const html = await createEmailWrapper(content, "Password Changed");
  return sendEmail(email, subject, html);
};

/* -------------------------------------------------------------------------- */
/*                          Account Verification Success                      */
/* -------------------------------------------------------------------------- */
export const sendAccountVerificationSuccess = async (name, email, role) => {
  const subject = "Account Verified Successfully! ✅";

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">✅</span>
      </div>
      
      <h2 style="color: ${
        COLORS.textDark
      }; font-size: 22px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
        Account Verified Successfully!
      </h2>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0; text-align: center;">
        Congratulations ${name}! Your ${role.toLowerCase()} account has been verified.
      </p>

      <div style="background: ${
        COLORS.success
      }10; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: ${
          COLORS.success
        }; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
          🎉 You're all set!
        </p>
        <p style="color: ${COLORS.textLight}; font-size: 13px; margin: 0;">
          You can now ${
            role === "PARTNER" ? "list your properties" : "book luxury stays"
          } and access all features.
        </p>
      </div>

      <p style="color: ${
        COLORS.textLight
      }; font-size: 13px; margin: 24px 0 0 0;">
        Ready to get started? Log in to your account and explore!
      </p>

      <p style="color: ${
        COLORS.textDark
      }; font-size: 14px; margin: 24px 0 0 0;">
        Best regards,<br>
        <strong style="color: ${
          COLORS.primary
        };">Team Bonfire Escapes 🔥</strong>
      </p>
    </div>
  `;

  const html = await createEmailWrapper(content, "Account Verified");
  return sendEmail(email, subject, html);
};

/* -------------------------------------------------------------------------- */
/*                          Support Email to Customer                         */
/* -------------------------------------------------------------------------- */
export const supportMailToAdmin = async ({ customerEmail, message }) => {
  const subject = "📩 New Support Request";

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">📩</span>
      </div>
      
      <h2 style="color: ${COLORS.textDark}; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
        New Support Request
      </h2>

      <div style="background: ${COLORS.grayBg}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 12px 0;">
          <strong>From:</strong><br/>
          <span style="color: ${COLORS.primary};">${customerEmail}</span>
        </p>
        
        <p style="margin: 0;">
          <strong>Message:</strong><br/>
          <span style="color: ${COLORS.textLight};">${message}</span>
        </p>
      </div>

      <div style="background: ${COLORS.primaryLight}; border-radius: 8px; padding: 12px; text-align: center;">
        <p style="color: ${COLORS.textLight}; font-size: 12px; margin: 0;">
          💡 Reply to this email to respond
        </p>
      </div>
    </div>
  `;

  const html = await createEmailWrapper(content, "New Support Request");

  return sendSupportMail({
    from: `"Support" <${process.env.NODEMAILER_EMAIL_USER}>`,
    to: process.env.NODEMAILER_EMAIL_USER,
    replyTo: customerEmail,
    subject,
    html,
    cc: customerEmail,
  });
};
/* -------------------------------------------------------------------------- */
/*                         Sub Admin Account Created                     */
/* -------------------------------------------------------------------------- */
export const sendSubAdminCreatedEmail = async (name, email, password) => {
  const subject = "Your Sub-Admin Account Details";

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">👨‍💼</span>
      </div>
      
      <h2 style="color: ${COLORS.textDark}; font-size: 22px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
        Sub-Admin Account Created
      </h2>
      
      <p style="color: ${COLORS.textLight}; font-size: 15px; line-height: 1.5; margin: 16px 0;">
        Hello ${name},
      </p>
      
      <p style="color: ${COLORS.textLight}; font-size: 15px; line-height: 1.5; margin: 16px 0;">
        Your <strong>Sub-Admin account</strong> has been successfully created on <strong>Bonfire Escapes</strong>.
      </p>

      <div style="background: ${COLORS.grayBg}; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0;">
          <strong style="color: ${COLORS.textDark};">Email:</strong><br/>
          <span style="color: ${COLORS.primary};">${email}</span>
        </p>
        <p style="margin: 0;">
          <strong style="color: ${COLORS.textDark};">Temporary Password:</strong><br/>
          <span style="color: ${COLORS.primary};">${password}</span>
        </p>
      </div>

      <div style="background: ${COLORS.danger}10; border-left: 4px solid ${COLORS.danger}; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: ${COLORS.danger}; font-size: 13px; margin: 0; font-weight: 600;">
          ⚠️ Security Notice:
        </p>
        <p style="color: ${COLORS.textLight}; font-size: 12px; margin: 8px 0 0 0;">
          Please change your password immediately after logging in for security reasons.
        </p>
      </div>

      <div style="background: ${COLORS.primaryLight}; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: center;">
        <p style="color: ${COLORS.textLight}; font-size: 12px; margin: 0;">
          🔐 If you were not expecting this email, please contact the administrator immediately.
        </p>
      </div>

      <p style="color: ${COLORS.textDark}; font-size: 14px; margin: 24px 0 0 0;">
        Best regards,<br>
        <strong style="color: ${COLORS.primary};">Team Bonfire Escapes 🔥</strong>
      </p>
    </div>
  `;

  const html = await createEmailWrapper(content, "Sub-Admin Account Details");
  return sendEmail(email, subject, html);
};



//  sendWelcomeEmail("rohit","rohit-singh@pearlorganisation.com","PARTNER").then(res=>console.log("done")).catch(error=>console.log(error));

// sendSubAdminCreatedEmail(
//   "durga",
//   "rohit-singh@pearlorganisation.com",
//   "121212"
// )
//   .then((res) => console.log("done"))
//   .catch((error) => console.log(error));
