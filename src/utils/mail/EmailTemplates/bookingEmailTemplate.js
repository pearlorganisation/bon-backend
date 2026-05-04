import { sendEmail } from "../mailer.js";
import PlatformSettings from "../../../models/PlatformSettings/platformSettings.model.js";
import { createEmailWrapper } from "./emailTemplate.js";

// Colors matching your invoice design
const COLORS = {
  primary: "#f97316",
  primaryDark: "#ea580c",
  primaryLight: "#fff7ed",
  textDark: "#1f2937",
  textLight: "#6b7280",
  success: "#22c55e",
  border: "#e5e7eb",
  grayBg: "#f9fafb",
};

const formatCurrency = (amount) => {
  const formatted = (amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₹ ${formatted}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

// ============================================================
//  Customer Booking Confirmation Email
// ============================================================
export const sendCustomerBookingConfirmation = async (booking, invoiceUrl) => {
  const subject = "Booking Confirmed! 🎉 - Bonfire Escapes";

  const nights = Math.ceil(
    (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
      (1000 * 60 * 60 * 24)
  );

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">🎉</span>
      </div>
      
      <h2 style="color: ${
        COLORS.textDark
      }; font-size: 22px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
        Booking Confirmed!
      </h2>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0; text-align: center;">
        Hello ${booking.primaryGuestDetails.fullName},
      </p>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0; text-align: center;">
        Your booking has been successfully confirmed. We can't wait to host you!
      </p>

      <!-- Booking Details Card -->
      <div style="background: ${
        COLORS.primaryLight
      }; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="color: ${
          COLORS.primaryDark
        }; font-size: 16px; margin: 0 0 16px 0;">
          🏨 Booking Details
        </h3>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Property:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${
    booking.propertyId?.name
  }</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Location:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${
    booking.propertyId?.address
  }, ${booking.propertyId?.city}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Dates:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${formatDate(
    booking.checkInDate
  )} - ${formatDate(booking.checkOutDate)} (${nights} nights)</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Guests:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${
    booking.numberOfGuests?.adults
  } Adults, ${booking.numberOfGuests?.children?.length || 0} Children</p>
        </div>
        
        <div>
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Confirmation Code:</strong></p>
          <p style="color: ${COLORS.primary}; font-weight: 600; margin: 0;">${
    booking.confirmationCode
  }</p>
        </div>
      </div>

      <!-- Price Breakdown -->
      <div style="background: ${
        COLORS.grayBg
      }; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: ${
          COLORS.textDark
        }; font-size: 14px; margin: 0 0 12px 0;">
          💰 Price Summary
        </h3>
        <div style="border-top: 1px solid ${COLORS.border}; padding-top: 12px;">
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Total Paid:</span>
            <strong style="color: ${COLORS.primaryDark};">${formatCurrency(
    booking.totalPrice
  )}</strong>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Payment Mode:</span>
            <span style="color: ${
              COLORS.textDark
            };">${booking.paymentMode?.replace("_", " ")}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Payment Status:</span>
            <span style="color: ${
              booking.paymentStatus === "paid" ? COLORS.success : COLORS.primary
            }; font-weight: 600;">
              ${booking.paymentStatus?.toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      <!-- Download Invoice Button -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${invoiceUrl}" 
           style="display: inline-block; background: ${
             COLORS.primary
           }; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          📄 Download Your Invoice
        </a>
      </div>

      <!-- Important Information -->
      <div style="background: ${
        COLORS.primaryLight
      }; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: ${
          COLORS.textDark
        }; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
          ℹ️ Important Information:
        </p>
        <ul style="color: ${
          COLORS.textLight
        }; font-size: 12px; margin: 0; padding-left: 20px;">
          <li style="margin: 4px 0;">Check-in time: ${
            booking.propertyId?.policies?.checkInTime || "2:00 PM"
          }</li>
          <li style="margin: 4px 0;">Check-out time: ${
            booking.propertyId?.policies?.checkOutTime || "12:00 PM"
          }</li>
          <li style="margin: 4px 0;">Valid government ID required for all guests</li>
          <li style="margin: 4px 0;">Please carry a copy of this confirmation</li>
        </ul>
      </div>

      <p style="color: ${
        COLORS.textDark
      }; font-size: 14px; margin: 24px 0 0 0;">
        Safe travels,<br>
        <strong style="color: ${
          COLORS.primary
        };">Team Bonfire Escapes 🔥</strong>
      </p>
    </div>
  `;

  const html = await createEmailWrapper(content, "Booking Confirmed");
  return sendEmail(booking.primaryGuestDetails.email, subject, html);
};

// ============================================================
//  Partner Booking Notification Email
// ============================================================
export const sendPartnerBookingNotification = async (booking, invoiceUrl) => {
  const subject = "New Booking Received! 📅 - Bonfire Escapes";

  const nights = Math.ceil(
    (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
      (1000 * 60 * 60 * 24)
  );

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">📅</span>
      </div>
      
      <h2 style="color: ${
        COLORS.textDark
      }; font-size: 22px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
        New Booking Received!
      </h2>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0; text-align: center;">
        Hello ${booking.propertyId?.name || "Partner"},
      </p>
      
      <p style="color: ${
        COLORS.textLight
      }; font-size: 15px; line-height: 1.5; margin: 16px 0; text-align: center;">
        Great news! A new booking has been made for your property.
      </p>

      <!-- Guest Details Card -->
      <div style="background: ${
        COLORS.primaryLight
      }; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="color: ${
          COLORS.primaryDark
        }; font-size: 16px; margin: 0 0 16px 0;">
          👤 Guest Information
        </h3>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Name:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${
    booking.primaryGuestDetails?.fullName
  }</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Email:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${
    booking.primaryGuestDetails?.email
  }</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Phone:</strong></p>
          <p style="color: ${COLORS.textLight}; margin: 0;">${
    booking.primaryGuestDetails?.phone
  }</p>
        </div>
        
        <div>
          <p style="margin: 0 0 4px 0;"><strong style="color: ${
            COLORS.textDark
          };">Confirmation Code:</strong></p>
          <p style="color: ${COLORS.primary}; font-weight: 600; margin: 0;">${
    booking.confirmationCode
  }</p>
        </div>
      </div>

      <!-- Stay Details Card -->
      <div style="background: ${
        COLORS.grayBg
      }; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: ${
          COLORS.textDark
        }; font-size: 14px; margin: 0 0 12px 0;">
          🏠 Stay Details
        </h3>
        <div style="border-top: 1px solid ${COLORS.border}; padding-top: 12px;">
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Check-in:</span>
            <span style="color: ${COLORS.textDark};">${formatDate(
    booking.checkInDate
  )}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Check-out:</span>
            <span style="color: ${COLORS.textDark};">${formatDate(
    booking.checkOutDate
  )}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Nights:</span>
            <span style="color: ${COLORS.textDark};">${nights}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Guests:</span>
            <span style="color: ${COLORS.textDark};">${
    booking.numberOfGuests?.adults
  } Adults, ${booking.numberOfGuests?.children?.length || 0} Children</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Payment Mode:</span>
            <span style="color: ${
              COLORS.textDark
            };">${booking.paymentMode?.replace("_", " ")}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Payment Status:</span>
            <span style="color: ${
              booking.paymentStatus === "paid" ? COLORS.success : COLORS.primary
            }; font-weight: 600;">
              ${booking.paymentStatus?.toUpperCase()}
            </span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span style="color: ${COLORS.textLight};">Total Amount:</span>
            <strong style="color: ${COLORS.primaryDark};">${formatCurrency(
    booking.totalPrice
  )}</strong>
          </p>
        </div>
      </div>

      <!-- Room Details -->
      ${
        booking.rooms && booking.rooms.length > 0
          ? `
      <div style="background: ${
        COLORS.grayBg
      }; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: ${
          COLORS.textDark
        }; font-size: 14px; margin: 0 0 12px 0;">
          🛏️ Rooms Booked
        </h3>
        <div style="border-top: 1px solid ${COLORS.border}; padding-top: 12px;">
          ${booking.rooms
            .map(
              (room) => `
            <p style="color: ${COLORS.textLight}; margin: 4px 0;">• ${room.roomId?.name} x ${room.quantity}</p>
          `
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      <!-- Special Requests -->
      ${
        booking.specialRequests
          ? `
      <div style="background: ${COLORS.primaryLight}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: ${COLORS.textDark}; font-size: 13px; margin: 0 0 8px 0;">
          📝 Special Requests from Guest:
        </h3>
        <p style="color: ${COLORS.textLight}; font-size: 13px; margin: 0;">${booking.specialRequests}</p>
      </div>
      `
          : ""
      }

      <!-- Download Invoice Button -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${invoiceUrl}" 
           style="display: inline-block; background: ${
             COLORS.primary
           }; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          📄 View Partner Invoice
        </a>
      </div>

      <!-- Action Items -->
      <div style="background: ${
        COLORS.primaryLight
      }; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: ${
          COLORS.textDark
        }; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
          ✅ Action Items:
        </p>
        <ul style="color: ${
          COLORS.textLight
        }; font-size: 12px; margin: 0; padding-left: 20px;">
          <li style="margin: 4px 0;">Confirm room availability</li>
          <li style="margin: 4px 0;">Prepare check-in arrangements</li>
          <li style="margin: 4px 0;">Review guest special requests</li>
          <li style="margin: 4px 0;">Contact guest if any clarification needed</li>
        </ul>
      </div>

      <p style="color: ${
        COLORS.textDark
      }; font-size: 14px; margin: 24px 0 0 0;">
        Thank you for partnering with us,<br>
        <strong style="color: ${
          COLORS.primary
        };">Team Bonfire Escapes 🔥</strong>
      </p>
    </div>
  `;

  const html = await createEmailWrapper(content, "New Booking Notification");

  // Get partner email from property partner
  const partnerEmail =
    booking.propertyId?.partnerId?.email || booking.propertyId?.PartnerEmail;

  if (partnerEmail) {
    return sendEmail(partnerEmail, subject, html);
  } else {
    console.log(
      "No partner email found for property:",
      booking.propertyId?.name
    );
    return null;
  }
};
