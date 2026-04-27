// import PDFDocument from "pdfkit";
// import path from "path";
// import fs from "fs";
// import { uploadFileToCloudinary } from "../cloudinary.js";
// import Partner from "../../models/Partner/partner.model.js";


// // ============================================================
// //  generatePartnerPayoutInvoicePDF
// //  Generates a monthly payout statement invoice for a partner.
// //  Mirrors the layout / helper conventions from the existing
// //  generateCustomerInvoicePDF / generatePartnerInvoicePDF fns.
// // ============================================================

// // 🎨 UI COLORS  (same palette used across all invoices)
// const COLORS = {
//   primary: "#f97316",
//   primaryDark: "#ea580c",
//   lightBg: "#fff7ed",
//   grayLight: "#f3f4f6",
//   border: "#e5e7eb",
//   textDark: "#1f2937",
//   textLight: "#6b7280",
//   success: "#22c55e",
//   danger: "#ef4444",
//   warning: "#f59e0b",
// };

// // ── small helpers ──────────────────────────────────────────
// const MONTH_NAMES = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];

// const formatDate = (dateStr) => {
//   if (!dateStr) return "N/A";
//   const date = new Date(dateStr);
//   return `${String(date.getDate()).padStart(2, "0")}/${String(
//     date.getMonth() + 1
//   ).padStart(2, "0")}/${date.getFullYear()}`;
// };

// const formatCurrency = (amount) => {
//   const formatted = (amount || 0).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
//   return `Rs. ${formatted}`;
// };

// // ── status badge colour helper ─────────────────────────────
// const walletStatusColor = (status) => {
//   switch ((status || "").toLowerCase()) {
//     case "paid":
//       return COLORS.success;
//     case "processing":
//       return COLORS.warning;
//     case "failed":
//       return COLORS.danger;
//     default:
//       return COLORS.textLight; // pending
//   }
// };

// // ── payment-status colour (per booking row) ───────────────
// const paymentStatusColor = (status) => {
//   switch ((status || "").toLowerCase()) {
//     case "paid":
//       return COLORS.success;
//     case "failed":
//       return COLORS.danger;
//     case "refunded":
//       return COLORS.warning;
//     default:
//       return COLORS.textLight;
//   }
// };

// // ============================================================
// export const generatePartnerPayoutInvoicePDF = async (
//   payout,
//   adminGSTIN,
//   invoiceNumber
// ) => {
//   return new Promise(async (resolve, reject) => {
//     const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
//     const buffers = [];

//     doc.on("data", buffers.push.bind(buffers));
//     doc.on("end", async () => {
//       try {
//         const pdfBuffer = Buffer.concat(buffers);
//         const file = {
//           buffer: pdfBuffer,
//           mimetype: "application/pdf",
//           originalname: `PAYOUT_${invoiceNumber}.pdf`,
//         };
//         const [uploaded] = await uploadFileToCloudinary(
//           file,
//           "/PayoutInvoices"
//         );
//         resolve(uploaded ? uploaded.secure_url : null);
//       } catch (error) {
//         reject(error);
//       }
//     });

//     try {
//       const partner = payout.partnerId; // populated Auth doc
//       const walletStatus = payout.partnerWallet?.status || "pending";
//       const payableAmount = payout.partnerWallet?.payableAmount || 0;
//       const periodLabel = `${MONTH_NAMES[(payout.payoutMonth || 1) - 1]} ${
//         payout.payoutYear
//       }`;
//       const bookings = payout.bookings || [];

//       // ════════════════════════════════════════════════════
//       //  HEADER  — two-tone band (same as partner invoice)
//       // ════════════════════════════════════════════════════

//       // Top orange band
//       doc.rect(0, 0, 595, 110).fill(COLORS.primary);

//       // Dark accent strip
//       doc.rect(0, 110, 595, 38).fill(COLORS.primaryDark);

//       // Logo
//       const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
//       if (fs.existsSync(logoPath)) {
//         doc.image(logoPath, 44, 16, { width: 86 });
//       }

//       // Title
//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(19)
//         .text("PARTNER PAYOUT STATEMENT", 44, 18, {
//           width: 507,
//           align: "right",
//         });

//       // Meta
//       doc.font("Helvetica").fontSize(7.8).fillColor("rgba(255,255,255,0.80)");
//       doc.text(`Ref No: ${invoiceNumber}`, 44, 52, {
//         width: 507,
//         align: "right",
//       });
//       doc.text(
//         `Issued: ${formatDate(new Date())}   |   Period: ${periodLabel}`,
//         44,
//         65,
//         { width: 507, align: "right" }
//       );

//       // Badge row — payout period pill (left) + wallet status pill (right)
//       doc.roundedRect(44, 117, 172, 22, 11).fill(COLORS.primaryDark);
//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(8.5)
//         .text(`PAYOUT PERIOD: ${periodLabel.toUpperCase()}`, 44, 123, {
//           width: 172,
//           align: "center",
//         });

//       const statusBadgeColor = walletStatusColor(walletStatus);
//       doc.roundedRect(379, 117, 172, 22, 11).fill(statusBadgeColor);
//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(8.5)
//         .text(walletStatus.toUpperCase(), 379, 123, {
//           width: 172,
//           align: "center",
//         });

//       // ════════════════════════════════════════════════════
//       //  GREETING BAND
//       // ════════════════════════════════════════════════════
//       doc.rect(0, 148, 595, 62).fill(COLORS.lightBg);
//       doc.rect(0, 148, 6, 62).fill(COLORS.primary);

//       // Faded decorative glyph
//       doc
//         .fillColor(COLORS.primary)
//         .opacity(0.07)
//         .font("Helvetica-Bold")
//         .fontSize(64)
//         .text("₹", 490, 143, { lineBreak: false });
//       doc.opacity(1);

//       const partnerName =
//         partner?.name || partner?.fullName || partner?.email || "Partner";

//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(14)
//         .text(`Hello, ${partnerName}!`, 22, 158, { width: 480 });

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica")
//         .fontSize(9)
//         .text(
//           `Here is your payout statement for ${periodLabel}. Please review the booking breakdown and payable amount below.`,
//           22,
//           175,
//           { width: 520 }
//         );

//       // ── Section divider ────────────────────────────────
//       doc
//         .moveTo(40, 214)
//         .lineTo(555, 214)
//         .strokeColor(COLORS.border)
//         .lineWidth(0.8)
//         .stroke();

//       // ════════════════════════════════════════════════════
//       //  PARTNER INFO CARD (left)  +  ADMIN INFO CARD (right)
//       // ════════════════════════════════════════════════════
//       const blockY = 224;

//       // ── Partner card ─────────────────────────────────────
//       doc.rect(40, blockY, 238, 90).fill(COLORS.grayLight);
//       doc.rect(40, blockY, 4, 90).fill(COLORS.primary);

//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(7.5)
//         .text("PARTNER DETAILS", 52, blockY + 8);

//     const partnerData = await Partner.findById(payout.partnerId);

//       const pan = partnerData?.panDetails || {};
//       const bank = partnerData?.bankDetails || {};
//      // const gstin = partnerData?.gstinList?.[0]?.gstin || "N/A";

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(9)
//         .text(pan.fullName || partnerName, 52, blockY + 20, { width: 214 });

//       doc.font("Helvetica").fontSize(7.8).fillColor(COLORS.textLight);
//       doc.text(`PAN: ${pan.panNumber || "N/A"}`, 52, blockY + 33, {
//         width: 214,
//       });
//       // doc.text(`GSTIN: ${gstin}`, 52, blockY + 44, { width: 214 });
//       doc.text(
//         `Bank: ${bank.bankName || "N/A"}  |  A/C: ${
//           bank.accountNumber || "N/A"
//         }`,
//         52,
//         blockY + 55,
//         { width: 214 }
//       );
//       doc.text(`IFSC: ${bank.ifscCode || "N/A"}`, 52, blockY + 66, {
//         width: 214,
//       });

//       // ── Admin / Platform card ─────────────────────────
//       doc.rect(292, blockY, 263, 90).fill(COLORS.grayLight);
//       doc.rect(292, blockY, 4, 90).fill(COLORS.primaryDark);

//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(7.5)
//         .text("PLATFORM (BONFIRE ESCAPE)", 304, blockY + 8);

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(9)
//         .text("Bonfire Escape Pvt. Ltd.", 304, blockY + 20);

//       doc.font("Helvetica").fontSize(7.8).fillColor(COLORS.textLight);
//       doc.text(`GSTIN: ${adminGSTIN}`, 304, blockY + 33);
//       doc.text(`Invoice Ref: ${invoiceNumber}`, 304, blockY + 44);
//       doc.text(`Statement Period: ${periodLabel}`, 304, blockY + 55);

//       // ════════════════════════════════════════════════════
//       //  WALLET SUMMARY STRIP
//       // ════════════════════════════════════════════════════
//       const walletY = blockY + 103;

//       doc.roundedRect(40, walletY, 515, 46, 6).fill(COLORS.lightBg);
//       doc.rect(40, walletY, 4, 46).fill(COLORS.primary);

//       // Payable amount — large, left
//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(8)
//         .text("TOTAL PAYABLE AMOUNT", 56, walletY + 8);

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(16)
//         .text(formatCurrency(payableAmount), 56, walletY + 20);

//       // Status badge — right
//       const badgeColor = walletStatusColor(walletStatus);
//       doc.roundedRect(420, walletY + 12, 120, 22, 5).fill(badgeColor);
//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(9)
//         .text(walletStatus.toUpperCase(), 420, walletY + 19, {
//           width: 120,
//           align: "center",
//         });

//       // ════════════════════════════════════════════════════
//       //  BOOKINGS TABLE
//       // ════════════════════════════════════════════════════
//       const tableTop = walletY + 62;

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(9.5)
//         .text("BOOKING BREAKDOWN", 40, tableTop);

//       // Column x-positions
//       const col = {
//         code: 40, // Confirmation code
//         property: 120, // Property name
//         checkin: 240, // Check-in
//         checkout: 288, // Check-out
//         totalPrice: 335, // Booking total
//         payMode: 385, // Payment mode
//         payStatus: 435, // Payment status
//         partnerAmt: 480, // Partner amount
//       };

//       // Header row
//       doc.rect(40, tableTop + 14, 515, 20).fill(COLORS.primary);
//       doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.8);

//       doc.text("CONF. CODE", col.code + 4, tableTop + 20);
//       doc.text("PROPERTY", col.property + 2, tableTop + 20, { width: 95 });
//       doc.text("CHECK-IN", col.checkin, tableTop + 20, {
//         width: 46,
//         align: "center",
//       });
//       doc.text("CHECK-OUT", col.checkout, tableTop + 20, {
//         width: 46,
//         align: "center",
//       });
//       doc.text("TOTAL", col.totalPrice, tableTop + 20, {
//         width: 46,
//         align: "right",
//       });
//       doc.text("MODE", col.payMode, tableTop + 20, {
//         width: 46,
//         align: "center",
//       });
//       doc.text("PAY STATUS", col.payStatus, tableTop + 20, {
//         width: 46,
//         align: "center",
//       });
//       doc.text("PARTNER AMT", col.partnerAmt, tableTop + 20, {
//         width: 70,
//         align: "right",
//       });

//       let rowY = tableTop + 44;

//       if (bookings.length === 0) {
//         doc
//           .fillColor(COLORS.textLight)
//           .font("Helvetica")
//           .fontSize(9)
//           .text("No bookings found for this payout period.", 40, rowY);
//         rowY += 20;
//       } else {
//         bookings.forEach((entry, idx) => {
//           const booking = entry.bookingId; // populated Booking doc

//           // Alternating row bg
//           doc
//             .rect(40, rowY - 3, 515, 22)
//             .fill(idx % 2 === 0 ? "#fff7ed" : "#ffffff");

//           const confirmCode = booking?.confirmationCode || "N/A";
//           const propertyName = booking?.propertyId?.name || "N/A";
//           const checkIn = formatDate(booking?.checkInDate);
//           const checkOut = formatDate(booking?.checkOutDate);
//           const totalPrice = booking?.totalPrice || 0;
//           const payMode = (booking?.paymentMode || "N/A").replace("_", " ");
//           const payStatus = booking?.paymentStatus || "N/A";
//           const partnerAmount = entry.partnerAmount || 0;
//           const partnerGST = entry.partner_gst || 0;

//           // Confirmation code
//           doc
//             .fillColor(COLORS.textDark)
//             .font("Helvetica-Bold")
//             .fontSize(7.2)
//             .text(confirmCode, col.code + 4, rowY, { width: 74 });

//           // Property name (truncated)
//           doc
//             .font("Helvetica")
//             .fontSize(7)
//             .fillColor(COLORS.textLight)
//             .text(propertyName, col.property + 2, rowY, {
//               width: 92,
//               ellipsis: true,
//             });

//           // Check-in / Check-out
//           doc.text(checkIn, col.checkin, rowY, { width: 46, align: "center" });
//           doc.text(checkOut, col.checkout, rowY, {
//             width: 46,
//             align: "center",
//           });

//           // Total price
//           doc
//             .fillColor(COLORS.textDark)
//             .text(formatCurrency(totalPrice), col.totalPrice, rowY, {
//               width: 46,
//               align: "right",
//             });

//           // Payment mode (short)
//           doc
//             .fillColor(COLORS.textLight)
//             .font("Helvetica")
//             .fontSize(6.5)
//             .text(payMode, col.payMode, rowY, { width: 46, align: "center" });

//           // Payment status — coloured text
//           doc
//             .fillColor(paymentStatusColor(payStatus))
//             .font("Helvetica-Bold")
//             .fontSize(6.8)
//             .text(payStatus.toUpperCase(), col.payStatus, rowY, {
//               width: 46,
//               align: "center",
//             });

//           // Partner amount
//           doc
//             .fillColor(COLORS.primaryDark)
//             .font("Helvetica-Bold")
//             .fontSize(7.2)
//             .text(formatCurrency(partnerAmount), col.partnerAmt, rowY, {
//               width: 70,
//               align: "right",
//             });

//           rowY += 20;

//           // Sub-row: GST / admin breakdown (lighter, indented)
//           doc
//             .fillColor(COLORS.textLight)
//             .font("Helvetica")
//             .fontSize(6.5)
//             .text(
//               `  Partner GST: ${formatCurrency(
//                 partnerGST
//               )}   |   Admin Amt: ${formatCurrency(
//                 entry.adminAmount || 0
//               )}   |   Admin GST: ${formatCurrency(entry.admin_gst || 0)}`,
//               col.code + 10,
//               rowY,
//               { width: 540 }
//             );

//           rowY += 10;

//           // Divider
//           doc
//             .moveTo(40, rowY)
//             .lineTo(555, rowY)
//             .strokeColor(COLORS.border)
//             .lineWidth(0.4)
//             .stroke();

//           rowY += 8;

//           // Page overflow guard
//           if (rowY > 760) {
//             doc.addPage();
//             rowY = 50;
//           }
//         });
//       }

//       // ════════════════════════════════════════════════════
//       //  TOTALS SUMMARY (right-aligned card)
//       // ════════════════════════════════════════════════════
//       if (rowY > 650) {
//         doc.addPage();
//         rowY = 50;
//       }

//       rowY += 10;

//       const totalPartnerAmt = bookings.reduce(
//         (s, b) => s + (b.partnerAmount || 0),
//         0
//       );
               
//       const totalAdminAmt = bookings.reduce(
//         (s, b) => s + (b.adminAmount || 0),
//         0
//       );
//       const totalAdminGST = bookings.reduce(
//         (s, b) => s + (b.admin_gst || 0),
//         0
//       );

//       const sumX = 330;
//       const sumLabelW = 130;
//       const sumValueW = 100;
//       const cardW = sumLabelW + sumValueW + 16;

//       // Light card
//       doc.rect(sumX - 8, rowY - 6, cardW, 106).fill(COLORS.grayLight);

//       const drawSumRow = (label, value, y) => {
//         doc
//           .font("Helvetica")
//           .fontSize(8)
//           .fillColor(COLORS.textLight)
//           .text(label, sumX, y, { width: sumLabelW });
//         doc.text(formatCurrency(value), sumX + sumLabelW, y, {
//           width: sumValueW,
//           align: "right",
//         });
//         doc
//           .moveTo(sumX, y + 11)
//           .lineTo(sumX + sumLabelW + sumValueW, y + 11)
//           .strokeColor(COLORS.border)
//           .lineWidth(0.4)
//           .stroke();
//       };

//       drawSumRow("Partner Amount (excl. GST)", totalPartnerAmt, rowY);
//       drawSumRow("Admin Commission", totalAdminAmt, rowY + 14);
//       drawSumRow("Admin GST", totalAdminGST, rowY + 28);
//       drawSumRow(
//         "Total Booking Value",
//         totalPartnerAmt  + totalAdminAmt + totalAdminGST,
//         rowY + 56
//       );

//       rowY += 74;

//       // Grand total pill
//       doc.roundedRect(sumX - 8, rowY, cardW, 28, 5).fill(COLORS.primary);

//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(9.5)
//         .text("PAYABLE TO PARTNER", sumX, rowY + 9, { width: sumLabelW });

//       doc.text(formatCurrency(payableAmount), sumX + sumLabelW, rowY + 9, {
//         width: sumValueW,
//         align: "right",
//       });

//       // ════════════════════════════════════════════════════
//       //  FOOTER
//       // ════════════════════════════════════════════════════
//       const footerY = Math.max(rowY + 44, 700);

//       doc
//         .moveTo(40, footerY)
//         .lineTo(555, footerY)
//         .strokeColor(COLORS.primary)
//         .lineWidth(1.5)
//         .stroke();

//       // Left — payout status note
//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(8)
//         .text("PAYOUT STATUS", 40, footerY + 10);

//       const statusColor2 = walletStatusColor(walletStatus);
//       doc.roundedRect(40, footerY + 24, 90, 16, 4).fill(statusColor2);
//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(7.5)
//         .text(walletStatus.toUpperCase(), 40, footerY + 29, {
//           width: 90,
//           align: "center",
//         });

//       // Centre — note
//       doc
//         .fillColor(COLORS.textLight)
//         .font("Helvetica")
//         .fontSize(7.2)
//         .text(
//           "This document is computer-generated and serves as an\nofficial payout statement from Bonfire Escape.",
//           200,
//           footerY + 10,
//           { width: 200, align: "center" }
//         );

//       // Right — admin GSTIN
//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(8)
//         .text("PLATFORM GSTIN", 420, footerY + 10);

//       doc
//         .fillColor(COLORS.textLight)
//         .font("Helvetica")
//         .fontSize(8)
//         .text(adminGSTIN, 420, footerY + 22);

//       // Bottom tagline
//       doc
//         .fontSize(7)
//         .fillColor(COLORS.textLight)
//         .text(
//           "Bonfire Escape — Auto-generated partner payout statement. Do not reply to this document.",
//           40,
//           782,
//           { align: "center", width: 515 }
//         );

//       doc.end();
//     } catch (err) {
//       reject(err);
//     }
//   });
// };


import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { uploadFileToCloudinary } from "../cloudinary.js";
import Partner from "../../models/Partner/partner.model.js";

// ============================================================
//  generatePartnerPayoutInvoicePDF
//  Generates a monthly payout statement invoice for a partner.
//  Mirrors the layout / helper conventions from the existing
//  generateCustomerInvoicePDF / generatePartnerInvoicePDF fns.
// ============================================================

// 🎨 UI COLORS  (same palette used across all invoices)
const COLORS = {
  primary: "#f97316",
  primaryDark: "#ea580c",
  lightBg: "#fff7ed",
  grayLight: "#f3f4f6",
  border: "#e5e7eb",
  textDark: "#1f2937",
  textLight: "#6b7280",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
};

// ── small helpers ──────────────────────────────────────────
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatCurrency = (amount) => {
  const formatted = (amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
};

// ── status badge colour helper ─────────────────────────────
const walletStatusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return COLORS.success;
    case "processing":
      return COLORS.warning;
    case "failed":
      return COLORS.danger;
    default:
      return COLORS.textLight; // pending
  }
};

// ── payment-status colour (per booking row) ───────────────
const paymentStatusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return COLORS.success;
    case "failed":
      return COLORS.danger;
    case "refunded":
      return COLORS.warning;
    default:
      return COLORS.textLight;
  }
};

// ============================================================
export const generatePartnerPayoutInvoicePDF = async (
  payout,
  adminGSTIN,
  invoiceNumber
) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const file = {
          buffer: pdfBuffer,
          mimetype: "application/pdf",
          originalname: `PAYOUT_${invoiceNumber}.pdf`,
        };
        const [uploaded] = await uploadFileToCloudinary(
          file,
          "/PayoutInvoices"
        );
        resolve(uploaded ? uploaded.secure_url : null);
      } catch (error) {
        reject(error);
      }
    });

    try {
      const partner = payout.partnerId; // populated Auth doc
      const walletStatus = payout.partnerWallet?.status || "pending";
      const payableAmount = payout.partnerWallet?.payableAmount || 0;
      const periodLabel = `${MONTH_NAMES[(payout.payoutMonth || 1) - 1]} ${
        payout.payoutYear
      }`;
      const bookings = payout.bookings || [];

      // Calculate totals ONLY for PAY_NOW bookings
      const payNowBookings = bookings.filter((entry) => {
        const booking = entry.bookingId;
        return booking?.paymentMode === "PAY_NOW";
      });

      const totalPartnerAmt = payNowBookings.reduce(
        (s, b) => s + (b.partnerAmount || 0),
        0
      );

      const totalPartnerGST = payNowBookings.reduce(
        (s, b) => s + (b.partner_gst || 0),
        0
      );

      const totalAdminAmt = payNowBookings.reduce(
        (s, b) => s + (b.adminAmount || 0),
        0
      );

      const totalAdminGST = payNowBookings.reduce(
        (s, b) => s + (b.admin_gst || 0),
        0
      );

      // ════════════════════════════════════════════════════
      //  HEADER  — two-tone band (same as partner invoice)
      // ════════════════════════════════════════════════════

      // Top orange band
      doc.rect(0, 0, 595, 110).fill(COLORS.primary);

      // Dark accent strip
      doc.rect(0, 110, 595, 38).fill(COLORS.primaryDark);

      // Logo
      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 44, 16, { width: 86 });
      }

      // Title
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(19)
        .text("PARTNER PAYOUT STATEMENT", 44, 18, {
          width: 507,
          align: "right",
        });

      // Meta
      doc.font("Helvetica").fontSize(7.8).fillColor("rgba(255,255,255,0.80)");
      doc.text(`Ref No: ${invoiceNumber}`, 44, 52, {
        width: 507,
        align: "right",
      });
      doc.text(
        `Issued: ${formatDate(new Date())}   |   Period: ${periodLabel}`,
        44,
        65,
        { width: 507, align: "right" }
      );

      // Badge row — payout period pill (left) + wallet status pill (right)
      doc.roundedRect(44, 117, 172, 22, 11).fill(COLORS.primaryDark);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(`PAYOUT PERIOD: ${periodLabel.toUpperCase()}`, 44, 123, {
          width: 172,
          align: "center",
        });

      const statusBadgeColor = walletStatusColor(walletStatus);
      doc.roundedRect(379, 117, 172, 22, 11).fill(statusBadgeColor);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(walletStatus.toUpperCase(), 379, 123, {
          width: 172,
          align: "center",
        });

      // ════════════════════════════════════════════════════
      //  GREETING BAND
      // ════════════════════════════════════════════════════
      doc.rect(0, 148, 595, 62).fill(COLORS.lightBg);
      doc.rect(0, 148, 6, 62).fill(COLORS.primary);

      // Faded decorative glyph
      doc
        .fillColor(COLORS.primary)
        .opacity(0.07)
        .font("Helvetica-Bold")
        .fontSize(64)
        .text("₹", 490, 143, { lineBreak: false });
      doc.opacity(1);

      const partnerName =
        partner?.name || partner?.fullName || partner?.email || "Partner";

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(14)
        .text(`Hello, ${partnerName}!`, 22, 158, { width: 480 });

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica")
        .fontSize(9)
        .text(
          `Here is your payout statement for ${periodLabel}. Please review the booking breakdown and payable amount below.`,
          22,
          175,
          { width: 520 }
        );

      // ── Section divider ────────────────────────────────
      doc
        .moveTo(40, 214)
        .lineTo(555, 214)
        .strokeColor(COLORS.border)
        .lineWidth(0.8)
        .stroke();

      // ════════════════════════════════════════════════════
      //  PARTNER INFO CARD (left)  +  ADMIN INFO CARD (right)
      // ════════════════════════════════════════════════════
      const blockY = 224;

      // ── Partner card ─────────────────────────────────────
      doc.rect(40, blockY, 238, 90).fill(COLORS.grayLight);
      doc.rect(40, blockY, 4, 90).fill(COLORS.primary);

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("PARTNER DETAILS", 52, blockY + 8);

      const partnerData = await Partner.findOne({ userId: payout.partnerId});

      const pan = partnerData?.panDetails || {};
      const bank = partnerData?.bankDetails || {};

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(pan.fullName || partnerName, 52, blockY + 20, { width: 214 });

      doc.font("Helvetica").fontSize(7.8).fillColor(COLORS.textLight);
      doc.text(`PAN: ${pan.panNumber || "N/A"}`, 52, blockY + 33, {
        width: 214,
      });
      doc.text(
        `Bank: ${bank.bankName || "N/A"}  |  A/C: ${
          bank.accountNumber || "N/A"
        }`,
        52,
        blockY + 55,
        { width: 214 }
      );
      doc.text(`IFSC: ${bank.ifscCode || "N/A"}`, 52, blockY + 66, {
        width: 214,
      });

      // ── Admin / Platform card ─────────────────────────
      doc.rect(292, blockY, 263, 90).fill(COLORS.grayLight);
      doc.rect(292, blockY, 4, 90).fill(COLORS.primaryDark);

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("PLATFORM (BONFIRE ESCAPE)", 304, blockY + 8);

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Bonfire Escape Pvt. Ltd.", 304, blockY + 20);

      doc.font("Helvetica").fontSize(7.8).fillColor(COLORS.textLight);
      doc.text(`GSTIN: ${adminGSTIN}`, 304, blockY + 33);
      doc.text(`Invoice Ref: ${invoiceNumber}`, 304, blockY + 44);
      doc.text(`Statement Period: ${periodLabel}`, 304, blockY + 55);

      // ════════════════════════════════════════════════════
      //  WALLET SUMMARY STRIP
      // ════════════════════════════════════════════════════
      const walletY = blockY + 103;

      doc.roundedRect(40, walletY, 515, 46, 6).fill(COLORS.lightBg);
      doc.rect(40, walletY, 4, 46).fill(COLORS.primary);

      // Payable amount — large, left
      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("TOTAL PAYABLE AMOUNT", 56, walletY + 8);

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(formatCurrency(payableAmount), 56, walletY + 20);

      // Status badge — right
      const badgeColor = walletStatusColor(walletStatus);
      doc.roundedRect(420, walletY + 12, 120, 22, 5).fill(badgeColor);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(walletStatus.toUpperCase(), 420, walletY + 19, {
          width: 120,
          align: "center",
        });

      // ════════════════════════════════════════════════════
      //  BOOKINGS TABLE
      // ════════════════════════════════════════════════════
      const tableTop = walletY + 62;

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text("BOOKING BREAKDOWN", 40, tableTop);

      // Column x-positions
      const col = {
        code: 40, // Confirmation code
        property: 120, // Property name
        checkin: 240, // Check-in
        checkout: 288, // Check-out
        totalPrice: 335, // Booking total
        payMode: 385, // Payment mode
        payStatus: 435, // Payment status
        partnerAmt: 480, // Partner amount
      };

      // Header row
      doc.rect(40, tableTop + 14, 515, 20).fill(COLORS.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.8);

      doc.text("CONF. CODE", col.code + 4, tableTop + 20);
      doc.text("PROPERTY", col.property + 2, tableTop + 20, { width: 95 });
      doc.text("CHECK-IN", col.checkin, tableTop + 20, {
        width: 46,
        align: "center",
      });
      doc.text("CHECK-OUT", col.checkout, tableTop + 20, {
        width: 46,
        align: "center",
      });
      doc.text("TOTAL", col.totalPrice, tableTop + 20, {
        width: 46,
        align: "right",
      });
      doc.text("MODE", col.payMode, tableTop + 20, {
        width: 46,
        align: "center",
      });
      doc.text("PAY STATUS", col.payStatus, tableTop + 20, {
        width: 46,
        align: "center",
      });
      doc.text("PARTNER AMT", col.partnerAmt, tableTop + 20, {
        width: 70,
        align: "right",
      });

      let rowY = tableTop + 44;

      if (bookings.length === 0) {
        doc
          .fillColor(COLORS.textLight)
          .font("Helvetica")
          .fontSize(9)
          .text("No bookings found for this payout period.", 40, rowY);
        rowY += 20;
      } else {
        bookings.forEach((entry, idx) => {
          const booking = entry.bookingId; // populated Booking doc

          // Alternating row bg
          doc
            .rect(40, rowY - 3, 515, 22)
            .fill(idx % 2 === 0 ? "#fff7ed" : "#ffffff");

          const confirmCode = booking?.confirmationCode || "N/A";
          const propertyName = booking?.propertyId?.name || "N/A";
          const checkIn = formatDate(booking?.checkInDate);
          const checkOut = formatDate(booking?.checkOutDate);
          const totalPrice = booking?.totalPrice || 0;
          const payMode = (booking?.paymentMode || "N/A").replace("_", " ");
          const payStatus = booking?.paymentStatus || "N/A";
          const partnerAmount = entry.partnerAmount || 0;
          const partnerGST = entry.partner_gst || 0;

          // Confirmation code
          doc
            .fillColor(COLORS.textDark)
            .font("Helvetica-Bold")
            .fontSize(7.2)
            .text(confirmCode, col.code + 4, rowY, { width: 74 });

          // Property name (truncated)
          doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor(COLORS.textLight)
            .text(propertyName, col.property + 2, rowY, {
              width: 92,
              ellipsis: true,
            });

          // Check-in / Check-out
          doc.text(checkIn, col.checkin, rowY, { width: 46, align: "center" });
          doc.text(checkOut, col.checkout, rowY, {
            width: 46,
            align: "center",
          });

          // Total price
          doc
            .fillColor(COLORS.textDark)
            .text(formatCurrency(totalPrice), col.totalPrice, rowY, {
              width: 46,
              align: "right",
            });

          // Payment mode (short)
          doc
            .fillColor(COLORS.textLight)
            .font("Helvetica")
            .fontSize(6.5)
            .text(payMode, col.payMode, rowY, { width: 46, align: "center" });

          // Payment status — coloured text
          doc
            .fillColor(paymentStatusColor(payStatus))
            .font("Helvetica-Bold")
            .fontSize(6.8)
            .text(payStatus.toUpperCase(), col.payStatus, rowY, {
              width: 46,
              align: "center",
            });

          // Partner amount
          doc
            .fillColor(COLORS.primaryDark)
            .font("Helvetica-Bold")
            .fontSize(7.2)
            .text(formatCurrency(partnerAmount), col.partnerAmt, rowY, {
              width: 70,
              align: "right",
            });

          rowY += 20;

          // Sub-row: GST / admin breakdown (lighter, indented)
          doc
            .fillColor(COLORS.textLight)
            .font("Helvetica")
            .fontSize(6.5)
            .text(
              `  Partner GST: ${formatCurrency(
                partnerGST
              )}   |   Admin Amt: ${formatCurrency(
                entry.adminAmount || 0
              )}   |   Admin GST: ${formatCurrency(entry.admin_gst || 0)}`,
              col.code + 10,
              rowY,
              { width: 540 }
            );

          rowY += 10;

          // Divider
          doc
            .moveTo(40, rowY)
            .lineTo(555, rowY)
            .strokeColor(COLORS.border)
            .lineWidth(0.4)
            .stroke();

          rowY += 8;

          // Page overflow guard
          if (rowY > 760) {
            doc.addPage();
            rowY = 50;
          }
        });
      }

      // ════════════════════════════════════════════════════
      //  TOTALS SUMMARY (right-aligned card)
      // ════════════════════════════════════════════════════
      if (rowY > 650) {
        doc.addPage();
        rowY = 50;
      }

      rowY += 10;

      const sumX = 330;
      const sumLabelW = 130;
      const sumValueW = 100;
      const cardW = sumLabelW + sumValueW + 16;

      // Light card
      doc.rect(sumX - 8, rowY - 6, cardW, 120).fill(COLORS.grayLight);

      const drawSumRow = (label, value, y) => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.textLight)
          .text(label, sumX, y, { width: sumLabelW });
        doc.text(formatCurrency(value), sumX + sumLabelW, y, {
          width: sumValueW,
          align: "right",
        });
        doc
          .moveTo(sumX, y + 11)
          .lineTo(sumX + sumLabelW + sumValueW, y + 11)
          .strokeColor(COLORS.border)
          .lineWidth(0.4)
          .stroke();
      };

      drawSumRow("Partner Amount (excl. GST)", totalPartnerAmt, rowY);
      drawSumRow("Partner GST", totalPartnerGST, rowY + 14);
      drawSumRow(
        "Total Partner Payout",
        totalPartnerAmt + totalPartnerGST,
        rowY + 28
      );
      drawSumRow("Admin Commission", totalAdminAmt, rowY + 42);
      drawSumRow("Admin GST", totalAdminGST, rowY + 56);
      drawSumRow(
        "Total Booking Value",
        totalPartnerAmt + totalPartnerGST + totalAdminAmt + totalAdminGST,
        rowY + 70
      );

      rowY += 88;

      // Grand total pill
      doc.roundedRect(sumX - 8, rowY, cardW, 28, 5).fill(COLORS.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text("PAYABLE TO PARTNER", sumX, rowY + 9, { width: sumLabelW });

      doc.text(formatCurrency(payableAmount), sumX + sumLabelW, rowY + 9, {
        width: sumValueW,
        align: "right",
      });

      // ════════════════════════════════════════════════════
      //  FOOTER
      // ════════════════════════════════════════════════════
      const footerY = Math.max(rowY + 44, 700);

      doc
        .moveTo(40, footerY)
        .lineTo(555, footerY)
        .strokeColor(COLORS.primary)
        .lineWidth(1.5)
        .stroke();

      // Left — payout status note
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PAYOUT STATUS", 40, footerY + 10);

      const statusColor2 = walletStatusColor(walletStatus);
      doc.roundedRect(40, footerY + 24, 90, 16, 4).fill(statusColor2);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(walletStatus.toUpperCase(), 40, footerY + 29, {
          width: 90,
          align: "center",
        });

      // Centre — note
      doc
        .fillColor(COLORS.textLight)
        .font("Helvetica")
        .fontSize(7.2)
        .text(
          "This document is computer-generated and serves as an\nofficial payout statement from Bonfire Escape.",
          200,
          footerY + 10,
          { width: 200, align: "center" }
        );

      // Right — admin GSTIN
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PLATFORM GSTIN", 420, footerY + 10);

      doc
        .fillColor(COLORS.textLight)
        .font("Helvetica")
        .fontSize(8)
        .text(adminGSTIN, 420, footerY + 22);

      // Bottom tagline
      doc
        .fontSize(7)
        .fillColor(COLORS.textLight)
        .text(
          "Bonfire Escape — Auto-generated partner payout statement. Do not reply to this document.",
          40,
          782,
          { align: "center", width: 515 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};