import axios from "axios";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../cloudinary.js";

// 🎨 UI COLORS (from your reference image)
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
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatCurrency = (amount, sign = "") => {
  const formatted = (amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}Rs. ${formatted}`;
};

const getImageBuffer = async (url) => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data);
  } catch (e) {
    return null;
  }
};

// export const generateCustomerInvoicePDF = async (booking, invoiceNumber) => {
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
//           originalname: `${invoiceNumber}.pdf`,
//         };
//         const [uploaded] = await uploadFileToCloudinary(file, "/Invoices");
//         resolve(uploaded ? uploaded.secure_url : null);
//       } catch (error) {
//         reject(error);
//       }
//     });

//     try {
//       const isPaid = booking.paymentStatus === "paid";

//       const normalizeDate = (date) => {
//         const d = new Date(date);
//         d.setUTCHours(0, 0, 0, 0);
//         return d;
//       };

//       const nights = Math.ceil(
//         (normalizeDate(booking.checkOutDate) -
//           normalizeDate(booking.checkInDate)) /
//           (1000 * 60 * 60 * 24)
//       );

//       // ================= HEADER =================
//       doc.rect(0, 0, 595, 150).fill(COLORS.primary);

//       const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
//       if (fs.existsSync(logoPath)) {
//         doc.image(logoPath, 50, 30, { width: 100 });
//       }

//       doc
//         .fillColor("#ffffff")
//         .fontSize(25)
//         .font("Helvetica-Bold")
//         .text("INVOICE", 400, 40, { align: "right" });

//       const statusColor = isPaid ? COLORS.success : COLORS.danger;
//       doc.rect(455, 75, 100, 20).fill(statusColor);

//       doc
//         .fillColor("#FFFFFF")
//         .fontSize(10)
//         .text(isPaid ? "PAID" : "PAYMENT DUE", 455, 80, {
//           width: 100,
//           align: "center",
//         });

//       doc.fillColor("#ffffff").font("Helvetica").fontSize(9);
//       doc.text(`Invoice Number: ${invoiceNumber}`, 400, 105, {
//         align: "right",
//       });
//       doc.text(
//         `Booking Date: ${formatDate(booking.createdAt || new Date())}`,
//         400,
//         118,
//         { align: "right" }
//       );
//       doc.text(`Confirmation Code: ${booking.confirmationCode}`, 400, 131, {
//         align: "right",
//       });

//       // ================= DIVIDER =================
//       doc.moveTo(40, 150).lineTo(555, 150).strokeColor(COLORS.border).stroke();

//       // ================= PROPERTY =================
//       const propX = 40;
//       const propY = 165;

//       const propertyImgUrl = booking.propertyId?.Images?.[0]?.secure_url;
//       if (propertyImgUrl) {
//         const imgBuffer = await getImageBuffer(propertyImgUrl);
//         if (imgBuffer) {
//           doc.save().roundedRect(propX, propY, 50, 50, 6).clip();
//           doc.image(imgBuffer, propX, propY, { width: 50, height: 50 });
//           doc.restore();
//         }
//       }

//       const propTextX = propertyImgUrl ? propX + 65 : propX;

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(11)
//         .text(booking.propertyId.name, propTextX, propY);

//       doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

//       doc.text(`${booking.propertyId.address},`, propTextX, doc.y + 2);
//       doc.text(
//         `${booking.propertyId.city}, ${booking.propertyId.state} - ${booking.propertyId.pincode}`,
//         propTextX,
//         doc.y + 2
//       );
//       doc.text(
//         `GSTIN: ${
//           booking.propertyId?.documentVerification?.GSTIN?.gstin || "N/A"
//         }`,
//         propTextX,
//         doc.y + 2
//       );

//       doc
//         .fillColor(COLORS.primaryDark)
//         .text("Location: View on Google Maps", propTextX, doc.y + 2, {
//           link: booking.propertyId.mapLink,
//         });

//       // ================= GUEST =================
//       const guestX = 380;

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(10)
//         .text("BILL TO", guestX, propY);

//       doc.font("Helvetica").fontSize(9).fillColor(COLORS.textLight);

//       doc.text(booking.primaryGuestDetails.fullName, guestX, doc.y + 3);
//       doc.text(booking.primaryGuestDetails.email, guestX, doc.y + 2);
//       doc.text(booking.primaryGuestDetails.phone, guestX, doc.y + 2);

//       if (booking.primaryGuestDetails.address) {
//         doc.text(booking.primaryGuestDetails.address, guestX, doc.y + 2);
//       }

//       // ================= SUMMARY =================
//       const summaryY = 260;

//       doc.roundedRect(40, summaryY, 515, 40, 6).fill(COLORS.lightBg);

//       doc.fillColor(COLORS.primaryDark).fontSize(9).font("Helvetica-Bold");

//       doc.text("CHECK-IN", 60, summaryY + 10);
//       doc.text("CHECK-OUT", 180, summaryY + 10);
//       doc.text("NIGHTS", 300, summaryY + 10);
//       doc.text("GUESTS", 420, summaryY + 10);

//       doc.font("Helvetica").fontSize(10).fillColor(COLORS.textDark);

//       doc.text(formatDate(booking.checkInDate), 60, summaryY + 22);
//       doc.text(formatDate(booking.checkOutDate), 180, summaryY + 22);
//       doc.text(nights.toString(), 300, summaryY + 22);

//       doc.text(
//         `${booking.numberOfGuests.adults} Adults, ${
//           booking.numberOfGuests.children?.length || 0
//         } Kids`,
//         420,
//         summaryY + 22
//       );

//       // // ================= TABLE =================
//       // const tableTop = 320;

//       // doc
//       //   .fillColor(COLORS.textDark)
//       //   .font("Helvetica-Bold")
//       //   .fontSize(10)
//       //   .text("BOOKING DETAILS", 40, tableTop);

//       // const headers = { desc: 40, qty: 250, price: 310, disc: 400, total: 480 };

//       // doc.rect(40, tableTop + 15, 515, 20).fill(COLORS.primary);

//       // doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");

//       // doc.text("DESCRIPTION", headers.desc + 10, tableTop + 21);
//       // doc.text("QTY", headers.qty, tableTop + 21, { align: "center" });
//       // doc.text(
//       //   booking.pricingType === "NIGHT" ? "UNIT PRICE" : "PACKAGE",
//       //   headers.price,
//       //   tableTop + 21,
//       //   { align: "right" }
//       // );
//       // doc.text("DISCOUNT", headers.disc, tableTop + 21, { align: "right" });
//       // doc.text("TOTAL", headers.total, tableTop + 21, { align: "right" });

//       // let rowY = tableTop + 45;

//       // booking.rooms.forEach((room) => {
//       //   doc
//       //     .fillColor(COLORS.textDark)
//       //     .font("Helvetica-Bold")
//       //     .fontSize(9)
//       //     .text(room.roomId.name, headers.desc + 10, rowY);

//       //   doc
//       //     .font("Helvetica")
//       //     .text(room.quantity.toString(), headers.qty, rowY, {
//       //       align: "center",
//       //     });

//       //   const unitPrice =
//       //     booking.pricingType === "NIGHT"
//       //       ? room.pricePerNight
//       //       : room.packagePrice;

//       //   doc.text(formatCurrency(unitPrice), headers.price, rowY, {
//       //     align: "right",
//       //   });

//       //   doc.text(formatCurrency(room.discount), headers.disc, rowY, {
//       //     align: "right",
//       //   });

//       //   let lineTotal = (unitPrice - room.discount) * room.quantity;
//       //   if (booking.pricingType === "NIGHT") lineTotal *= nights;

//       //   doc.text(formatCurrency(lineTotal), headers.total, rowY, {
//       //     align: "right",
//       //   });

//       //   rowY += 15;

//       //   if (room.extraServices?.length) {
//       //     room.extraServices.forEach((service) => {
//       //       doc
//       //         .fillColor(COLORS.textLight)
//       //         .fontSize(8)
//       //         .text(`  + ${service.name}`, headers.desc + 10, rowY);

//       //       doc.text(formatCurrency(service.fee), headers.total, rowY, {
//       //         align: "right",
//       //       });

//       //       rowY += 12;
//       //     });
//       //   }

//       //   rowY += 10;

//       //   doc
//       //     .moveTo(40, rowY)
//       //     .lineTo(555, rowY)
//       //     .strokeColor(COLORS.border)
//       //     .stroke();

//       //   rowY += 15;
//       // });
//       // ================= TABLE =================
//       const tableTop = 320;

//       doc
//         .fillColor(COLORS.textDark)
//         .font("Helvetica-Bold")
//         .fontSize(10)
//         .text("BOOKING DETAILS", 40, tableTop);

//       // ✅ Better column spacing
//       const headers = {
//         desc: 40,
//         type: 230,
//         qty: 270,
//         price: 290,
//         disc: 380,
//         total: 470,
//       };

//       // Header Background
//       doc.rect(40, tableTop + 15, 515, 20).fill(COLORS.primary);

//       doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");

//       // Header Text
//       doc.text("DESCRIPTION", headers.desc + 10, tableTop + 21);
//       doc.text("TYPE", headers.type, tableTop + 21, {
//         width: 40,
//         align: "center",
//       });
//       doc.text("QTY", headers.qty, tableTop + 21, {
//         width: 40,
//         align: "center",
//       });

//       doc.text(
//         booking.pricingType === "NIGHT" ? "UNIT PRICE" : "PACKAGE",
//         headers.price,
//         tableTop + 21,
//         { width: 80, align: "right" }
//       );

//       doc.text("DISCOUNT", headers.disc, tableTop + 21, {
//         width: 80,
//         align: "right",
//       });

//       doc.text("TOTAL", headers.total, tableTop + 21, {
//         width: 80,
//         align: "right",
//       });

//       let rowY = tableTop + 45;

//       // ✅ Safety check
//       if (!booking.rooms || booking.rooms.length === 0) {
//         doc
//           .fillColor(COLORS.textDark)
//           .fontSize(9)
//           .text("No booking details available.", 40, rowY);
//       } else {
//         booking.rooms.forEach((room) => {
//           const discount = room.discount || 0;

//           const unitPrice =
//             booking.pricingType === "NIGHT"
//               ? room.pricePerNight || 0
//               : room.packagePrice || 0;

//           let lineTotal = (unitPrice - discount) * (room.quantity || 1);
//           if (booking.pricingType === "NIGHT") lineTotal *= nights;

//           // ✅ Description with width control
//           const descHeight = doc.heightOfString(room.roomId.name, {
//             width: 200,
//           });

//           const rowHeight = Math.max(descHeight, 15);

//           doc
//             .fillColor(COLORS.textDark)
//             .font("Helvetica-Bold")
//             .fontSize(9)
//             .text(room.roomId.name, headers.desc + 10, rowY, {
//               width: 200,
//               ellipsis: true,
//             });
//           doc
//             .font("Helvetica")
//             .text(
//               (room.roomId?.typeOfRoom || "N/A").toString(),
//               headers.type,
//               rowY,
//               {
//                 width: 40,
//                 align: "center",
//               }
//             );

//           // QTY
//           doc
//             .font("Helvetica")
//             .text((room.quantity || 1).toString(), headers.qty, rowY, {
//               width: 40,
//               align: "center",
//             });

//           // UNIT PRICE
//           doc.text(formatCurrency(unitPrice), headers.price, rowY, {
//             width: 80,
//             align: "right",
//           });

//           // DISCOUNT
//           doc.text(formatCurrency(discount), headers.disc, rowY, {
//             width: 80,
//             align: "right",
//           });

//           // TOTAL
//           doc.text(formatCurrency(lineTotal), headers.total, rowY, {
//             width: 80,
//             align: "right",
//           });

//           rowY += rowHeight;

//           // ✅ Extra Services
//           if (room.extraServices?.length) {
//             room.extraServices.forEach((service) => {
//               const serviceTotal = (service.fee || 0) * (room.quantity || 1);

//               doc
//                 .fillColor(COLORS.textLight)
//                 .fontSize(8)
//                 .text(`   + ${service.name}`, headers.desc + 20, rowY, {
//                   width: 180,
//                 });

//               doc.text(formatCurrency(serviceTotal), headers.total, rowY, {
//                 width: 80,
//                 align: "right",
//               });

//               rowY += 12;
//             });
//           }

//           rowY += 8;

//           // Divider line
//           doc
//             .moveTo(40, rowY)
//             .lineTo(555, rowY)
//             .strokeColor(COLORS.border)
//             .stroke();

//           rowY += 12;
//         });
//       }

//       // ================= CALC =================
//       if (rowY > 650) {
//         doc.addPage();
//         rowY = 50;
//       }

//       const calcX = 350;

//       const drawCalcRow = (label, val, y, isBold = false, sign = "") => {
//         doc
//           .fillColor(isBold ? COLORS.textDark : COLORS.textLight)
//           .font(isBold ? "Helvetica-Bold" : "Helvetica")
//           .fontSize(9);

//         doc.text(label, calcX, y);
//         doc.text(formatCurrency(val, sign), calcX + 100, y, {
//           align: "right",
//         });
//       };

//       drawCalcRow("Base Subtotal", booking.priceBreakdown.basePrice, rowY);
//       drawCalcRow(
//         "Total Discounts",
//         booking.priceBreakdown.discountAmount,
//         rowY + 15
//       );
//       drawCalcRow(
//         "Service Fees",
//         booking.priceBreakdown.extraServicesFee,
//         rowY + 30
//       );

//       if (booking.priceBreakdown.childrenCharge) {
//         drawCalcRow(
//           "Children Charges",
//           booking.priceBreakdown.childrenCharge,
//           rowY + 45
//         );
//         rowY += 15;
//       }

//       drawCalcRow("GST (Taxes)", booking.priceBreakdown.gst_amount, rowY + 45);

//       rowY += 70;

//       doc.roundedRect(calcX, rowY - 10, 210, 25, 6).fill(COLORS.primary);

//       doc
//         .fillColor("#fff")
//         .font("Helvetica-Bold")
//         .fontSize(11)
//         .text("GRAND TOTAL", calcX + 10, rowY - 3);

//       doc.text(formatCurrency(booking.totalPrice), calcX + 70, rowY - 3, {
//         align: "right",
//       });

//       // ================= FOOTER =================
//       const footerY = 700;

//       doc
//         .moveTo(40, footerY - 20)
//         .lineTo(555, footerY - 20)
//         .strokeColor(COLORS.primary)
//         .stroke();

//       // Payment
//       doc
//         .fillColor(COLORS.textDark)
//         .fontSize(9)
//         .text("PAYMENT INFO", 40, footerY);

//       doc.fillColor(COLORS.textLight).fontSize(8);

//       doc.text(
//         `Method: ${booking.paymentMode?.replace("_", " ")}`,
//         40,
//         footerY + 12
//       );

//       if (isPaid && booking.paymentMode === "PAY_NOW") {
//         doc.text(
//           `Txn ID: ${booking.payment?.razorpayPaymentId || "N/A"}`,
//           40,
//           footerY + 22
//         );
//       } else {
//         doc.text(
//           "Outstanding balance to be cleared at check-in.",
//           40,
//           footerY + 22
//         );
//       }

//       // Cancellation
//       doc
//         .fillColor(COLORS.textDark)
//         .fontSize(9)
//         .text("CANCELLATION POLICY", 250, footerY);

//       const policies = booking.propertyId.policies?.cancellationPolicy || [];
//       let polY = footerY + 12;

//       if (policies.length === 0) {
//         doc
//           .fillColor(COLORS.textLight)
//           .fontSize(7)
//           .text("No cancellation policy available.", 250, polY);
//       } else {
//         policies.forEach((p) => {
//           doc
//             .fillColor(COLORS.textLight)
//             .fontSize(7)
//             .text(
//               `• ${p.daysBeforeCheckIn} days: ${p.refundPercentage}% refund`,
//               250,
//               polY
//             );
//           polY += 10;
//         });
//       }

//       // Terms
//       doc
//         .fillColor(COLORS.textDark)
//         .fontSize(9)
//         .text("TERMS & CONDITIONS", 420, footerY);

//       doc.fillColor(COLORS.textLight).fontSize(7);

//       doc.text(
//         "• Check-in: " + (booking.propertyId.policies?.checkInTime || "2 PM"),
//         420,
//         footerY + 12
//       );

//       doc.text(
//         "• Check-out: " +
//           (booking.propertyId.policies?.checkOutTime || "12 PM"),
//         420,
//         footerY + 22
//       );

//       doc.text("• Valid Photo ID required.", 420, footerY + 32);

//       doc
//         .fontSize(8)
//         .fillColor(COLORS.textLight)
//         .text("Bonfire Luxury Stays - Computer Generated Invoice", 40, 780, {
//           align: "center",
//           width: 515,
//         });

//       doc.end();
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

export const generateCustomerInvoicePDF = async (booking, invoiceNumber) => {
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
          originalname: `${invoiceNumber}.pdf`,
        };
        const [uploaded] = await uploadFileToCloudinary(file, "/Invoices");
        resolve(uploaded ? uploaded.secure_url : null);
      } catch (error) {
        reject(error);
      }
    });

    try {
      const isPaid = booking.paymentStatus === "paid";

      const normalizeDate = (date) => {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      };

      const nights = Math.ceil(
        (normalizeDate(booking.checkOutDate) -
          normalizeDate(booking.checkInDate)) /
          (1000 * 60 * 60 * 24)
      );

      // ================= HEADER (REDUCED HEIGHT) =================
      doc.rect(0, 0, 595, 110).fill(COLORS.primary);

      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 25, { width: 80 });
      }

      doc
        .fillColor("#ffffff")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("INVOICE", 400, 20, { align: "right" });

      const statusColor = isPaid ? COLORS.success : COLORS.danger;
      doc.rect(455, 50, 100, 20).fill(statusColor);

      doc
        .fillColor("#FFFFFF")
        .fontSize(10)
        .text(isPaid ? "PAID" : "PAYMENT DUE", 455, 55, {
          width: 100,
          align: "center",
        });

      doc.fillColor("#ffffff").font("Helvetica").fontSize(9);
      doc.text(`Invoice Number: ${invoiceNumber}`, 400, 78, {
        align: "right",
      });
      doc.text(
        `Booking Date: ${formatDate(booking.createdAt || new Date())}`,
        400,
        90,
        { align: "right" }
      );
      doc.text(`Confirmation Code: ${booking.confirmationCode}`, 400, 102, {
        align: "right",
      });

      // ================= DIVIDER =================
      doc.moveTo(40, 125).lineTo(555, 125).strokeColor(COLORS.border).stroke();

      // ================= PROPERTY (WITH ROUNDED CORNERS) =================
      const propX = 40;
      const propY = 140;

      // Rounded rectangle for property card
      doc
        .roundedRect(propX, propY, 250, 110, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      const propertyImgUrl = booking.propertyId?.Images?.[0]?.secure_url;
      if (propertyImgUrl) {
        const imgBuffer = await getImageBuffer(propertyImgUrl);
        if (imgBuffer) {
          doc
            .save()
            .roundedRect(propX + 10, propY + 10, 50, 50, 6)
            .clip();
          doc.image(imgBuffer, propX + 10, propY + 10, {
            width: 50,
            height: 50,
          });
          doc.restore();
        }
      }

      const propTextX = propertyImgUrl ? propX + 75 : propX + 10;

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(booking.propertyId.name, propTextX, propY + 12);

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

      doc.text(`${booking.propertyId.address},`, propTextX, doc.y + 2);
      doc.text(
        `${booking.propertyId.city}, ${booking.propertyId.state} - ${booking.propertyId.pincode}`,
        propTextX,
        doc.y + 2
      );
      doc.text(
        `GSTIN: ${
          booking.propertyId?.documentVerification?.GSTIN?.gstin || "N/A"
        }`,
        propTextX,
        doc.y + 2
      );

      doc
        .fillColor(COLORS.primaryDark)
        .text("Location: View on Google Maps", propTextX, doc.y + 2, {
          link: booking.propertyId.mapLink,
        });

      // ================= GUEST (WITH ROUNDED CORNERS) =================
      const guestX = 305;

      // Rounded rectangle for guest card
      doc
        .roundedRect(guestX, propY, 250, 110, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("BILL TO", guestX + 10, propY + 12);

      doc.font("Helvetica").fontSize(9).fillColor(COLORS.textLight);

      doc.text(booking.primaryGuestDetails.fullName, guestX + 10, doc.y + 3);
      doc.text(booking.primaryGuestDetails.email, guestX + 10, doc.y + 2);
      doc.text(booking.primaryGuestDetails.phone, guestX + 10, doc.y + 2);

      if (booking.primaryGuestDetails.address) {
        doc.text(booking.primaryGuestDetails.address, guestX + 10, doc.y + 2);
      }

      // ================= SUMMARY =================
      const summaryY = 265;

      doc.roundedRect(40, summaryY, 515, 40, 6).fill(COLORS.lightBg);

      doc.fillColor(COLORS.primaryDark).fontSize(9).font("Helvetica-Bold");

      doc.text("CHECK-IN", 60, summaryY + 10);
      doc.text("CHECK-OUT", 180, summaryY + 10);
      doc.text("NIGHTS", 300, summaryY + 10);
      doc.text("GUESTS", 420, summaryY + 10);

      doc.font("Helvetica").fontSize(10).fillColor(COLORS.textDark);

      doc.text(formatDate(booking.checkInDate), 60, summaryY + 22);
      doc.text(formatDate(booking.checkOutDate), 180, summaryY + 22);
      doc.text(nights.toString(), 300, summaryY + 22);

      doc.text(
        `${booking.numberOfGuests.adults} Adults, ${
          booking.numberOfGuests.children?.length || 0
        } Kids`,
        420,
        summaryY + 22
      );

      // ================= TABLE =================
      const tableTop = 320;

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("BOOKING DETAILS", 40, tableTop);

      const headers = {
        desc: 40,
        type: 230,
        qty: 270,
        price: 290,
        disc: 380,
        total: 470,
      };

      doc.rect(40, tableTop + 15, 515, 20).fill(COLORS.primary);

      doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");

      doc.text("DESCRIPTION", headers.desc + 10, tableTop + 21);
      doc.text("TYPE", headers.type, tableTop + 21, {
        width: 40,
        align: "center",
      });
      doc.text("QTY", headers.qty, tableTop + 21, {
        width: 40,
        align: "center",
      });

      doc.text(
        booking.pricingType === "NIGHT" ? "UNIT PRICE" : "PACKAGE",
        headers.price,
        tableTop + 21,
        { width: 80, align: "right" }
      );

      doc.text("DISCOUNT", headers.disc, tableTop + 21, {
        width: 80,
        align: "right",
      });

      doc.text("TOTAL", headers.total, tableTop + 21, {
        width: 80,
        align: "right",
      });

      let rowY = tableTop + 45;

      if (!booking.rooms || booking.rooms.length === 0) {
        doc
          .fillColor(COLORS.textDark)
          .fontSize(9)
          .text("No booking details available.", 40, rowY);
      } else {
        booking.rooms.forEach((room) => {
          const discount = room.discount || 0;

          const unitPrice =
            booking.pricingType === "NIGHT"
              ? room.pricePerNight || 0
              : room.packagePrice || 0;

          let lineTotal = (unitPrice - discount) * (room.quantity || 1);
          if (booking.pricingType === "NIGHT") lineTotal *= nights;

          const descHeight = doc.heightOfString(room.roomId.name, {
            width: 200,
          });

          const rowHeight = Math.max(descHeight, 15);

          doc
            .fillColor(COLORS.textDark)
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(room.roomId.name, headers.desc + 10, rowY, {
              width: 200,
              ellipsis: true,
            });
          doc
            .font("Helvetica")
            .text(
              (room.roomId?.typeOfRoom || "N/A").toString(),
              headers.type,
              rowY,
              {
                width: 40,
                align: "center",
              }
            );

          doc
            .font("Helvetica")
            .text((room.quantity || 1).toString(), headers.qty, rowY, {
              width: 40,
              align: "center",
            });

          doc.text(formatCurrency(unitPrice), headers.price, rowY, {
            width: 80,
            align: "right",
          });

          doc.text(formatCurrency(discount), headers.disc, rowY, {
            width: 80,
            align: "right",
          });

          doc.text(formatCurrency(lineTotal), headers.total, rowY, {
            width: 80,
            align: "right",
          });

          rowY += rowHeight;

          if (room.extraServices?.length) {
            room.extraServices.forEach((service) => {
              const serviceTotal = (service.fee || 0) * (room.quantity || 1);

              doc
                .fillColor(COLORS.textLight)
                .fontSize(8)
                .text(`   + ${service.name}`, headers.desc + 20, rowY, {
                  width: 180,
                });

              doc.text(formatCurrency(serviceTotal), headers.total, rowY, {
                width: 80,
                align: "right",
              });

              rowY += 12;
            });
          }

          rowY += 8;

          doc
            .moveTo(40, rowY)
            .lineTo(555, rowY)
            .strokeColor(COLORS.border)
            .stroke();

          rowY += 12;
        });
      }

      // ================= CALC =================
      if (rowY > 650) {
        doc.addPage();
        rowY = 50;
      }

      const calcX = 350;

      const drawCalcRow = (label, val, y, isBold = false, sign = "") => {
        doc
          .fillColor(isBold ? COLORS.textDark : COLORS.textLight)
          .font(isBold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9);

        doc.text(label, calcX, y);
        doc.text(formatCurrency(val, sign), calcX + 100, y, {
          align: "right",
        });
      };

      drawCalcRow("Base Subtotal", booking.priceBreakdown.basePrice, rowY);
      drawCalcRow(
        "Total Discounts",
        booking.priceBreakdown.discountAmount,
        rowY + 15
      );
      drawCalcRow(
        "Service Fees",
        booking.priceBreakdown.extraServicesFee,
        rowY + 30
      );

      if (booking.priceBreakdown.childrenCharge) {
        drawCalcRow(
          "Children Charges",
          booking.priceBreakdown.childrenCharge,
          rowY + 45
        );
        rowY += 15;
      }

      drawCalcRow("GST (Taxes)", booking.priceBreakdown.gst_amount, rowY + 45);

      rowY += 70;

      doc.roundedRect(calcX, rowY - 10, 210, 25, 6).fill(COLORS.primary);

      doc
        .fillColor("#fff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("GRAND TOTAL", calcX + 10, rowY - 3);

      doc.text(formatCurrency(booking.totalPrice), calcX + 70, rowY - 3, {
        align: "right",
      });

      // ================= THREE COLUMN FOOTER (WITH ROUNDED CORNERS) =================
      const footerY = Math.max(rowY + 30, 700);

      // Payment Info Card (Left)
      const paymentX = 40;
      const paymentWidth = 165;
      doc
        .roundedRect(paymentX, footerY, paymentWidth, 85, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.textDark)
        .fontSize(9)
        .text("PAYMENT INFO", paymentX + 8, footerY + 8);

      doc.fillColor(COLORS.textLight).fontSize(8);

      let paymentY = footerY + 25;
      doc.text(
        `Method: ${booking.paymentMode?.replace("_", " ")}`,
        paymentX + 8,
        paymentY
      );
      paymentY += 15;

      if (isPaid && booking.paymentMode === "PAY_NOW") {
        doc.text(
          `Txn ID: ${booking.payment?.razorpayPaymentId || "N/A"}`,
          paymentX + 8,
          paymentY
        );
        paymentY += 15;
        doc.text(
          `Amount: ${formatCurrency(
            booking.payment?.amount || booking.totalPrice
          )}`,
          paymentX + 8,
          paymentY
        );
      } else {
        doc
          .fontSize(7)
          .text(
            "Outstanding balance to be cleared at check-in.",
            paymentX + 8,
            paymentY
          );
      }

      // Cancellation Policy Card (Middle)
      const cancelX = 215;
      const cancelWidth = 165;
      const policies = booking.propertyId.policies?.cancellationPolicy || [];
      const cancelHeight = Math.max(85, 25 + policies.length * 12);

      doc
        .roundedRect(cancelX, footerY, cancelWidth, cancelHeight, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.textDark)
        .fontSize(9)
        .text("CANCELLATION POLICY", cancelX + 8, footerY + 8);

      let cancelY = footerY + 25;
      if (policies.length === 0) {
        doc
          .fillColor(COLORS.textLight)
          .fontSize(7)
          .text("No cancellation policy available.", cancelX + 8, cancelY);
      } else {
        policies.forEach((p) => {
          doc
            .fillColor(COLORS.textLight)
            .fontSize(7)
            .text(
              `• ${p.daysBeforeCheckIn} days: ${p.refundPercentage}% refund`,
              cancelX + 8,
              cancelY
            );
          cancelY += 10;
        });
      }

      // Terms & Conditions Card (Right)
      const termsX = 390;
      const termsWidth = 165;
      doc
        .roundedRect(termsX, footerY, termsWidth, 85, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.textDark)
        .fontSize(9)
        .text("TERMS & CONDITIONS", termsX + 8, footerY + 8);

      doc.fillColor(COLORS.textLight).fontSize(7);

      let termsY = footerY + 25;
      doc.text(
        `• Check-in: ${booking.propertyId.policies?.checkInTime || "2 PM"}`,
        termsX + 8,
        termsY
      );
      termsY += 12;
      doc.text(
        `• Check-out: ${booking.propertyId.policies?.checkOutTime || "12 PM"}`,
        termsX + 8,
        termsY
      );
      termsY += 12;
      doc.text("• Valid Photo ID required.", termsX + 8, termsY);

      // Bottom Footer Line
      const footerBottom = Math.max(footerY + cancelHeight, footerY + 85) + 15;

      doc
        .moveTo(40, footerBottom)
        .lineTo(555, footerBottom)
        .strokeColor(COLORS.primary)
        .stroke();

      doc
        .fontSize(8)
        .fillColor(COLORS.textLight)
        .text(
          "Bonfire Luxury Stays - Computer Generated Invoice",
          40,
          footerBottom + 8,
          {
            align: "center",
            width: 515,
          }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================================
//  generatePartnerInvoicePDF
//  Sent to the hotel/property partner when a new booking is
//  confirmed on Bonfire Escape.
// ============================================================

export const generatePartnerInvoicePDF = async (booking, invoiceNumber) => {
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
          originalname: `PARTNER_${invoiceNumber}.pdf`,
        };
        const [uploaded] = await uploadFileToCloudinary(
          file,
          "/PartnerInvoices"
        );
        resolve(uploaded ? uploaded.secure_url : null);
      } catch (error) {
        reject(error);
      }
    });

    try {
      // ── helpers ────────────────────────────────────────────
      const normalizeDate = (date) => {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      };

      const nights = Math.ceil(
        (normalizeDate(booking.checkOutDate) -
          normalizeDate(booking.checkInDate)) /
          (1000 * 60 * 60 * 24)
      );

      const propertyName = booking.propertyId?.name || "Your Property";
      const isPaid = booking.paymentStatus === "paid";

      // ════════════════════════════════════════════════════════
      //  HEADER — two-tone split
      //  • Top orange band  (0–110):  logo + title + meta
      //  • Bottom dark strip (110–148): badges
      // ════════════════════════════════════════════════════════

      // Top orange band
      doc.rect(0, 0, 595, 110).fill(COLORS.primary);

      // Bottom dark accent strip
      doc.rect(0, 110, 595, 38).fill(COLORS.primaryDark);

      // ── Logo ───────────────────────────────────────────────
      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 44, 16, { width: 86 });
      }

      // ── "PARTNER BOOKING NOTICE" — top right ───────────────
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("PARTNER BOOKING NOTICE", 44, 18, {
          width: 507,
          align: "right",
        });

      // ── Meta (ref / date / confirmation) under title ───────
      doc.font("Helvetica").fontSize(7.8).fillColor("rgba(255,255,255,0.80)");

      doc.text(`Ref No: ${invoiceNumber}`, 44, 50, {
        width: 507,
        align: "right",
      });
      doc.text(
        `Issued: ${formatDate(
          booking.createdAt || new Date()
        )}   |   Confirmation: ${booking.confirmationCode}`,
        44,
        63,
        { width: 507, align: "right" }
      );

      // ── Badge row inside dark strip ────────────────────────

      // Left pill — "NEW BOOKING CONFIRMED"
      doc.roundedRect(44, 117, 172, 22, 11).fill(COLORS.success);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("NEW BOOKING CONFIRMED", 44, 123, {
          width: 172,
          align: "center",
        });

      // Right pill — payment status
      const statusColor = isPaid ? COLORS.success : "#f59e0b";
      doc.roundedRect(379, 117, 172, 22, 11).fill(statusColor);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(isPaid ? "PAYMENT RECEIVED" : "PAYMENT ON ARRIVAL", 379, 123, {
          width: 172,
          align: "center",
        });

      // ════════════════════════════════════════════════════════
      //  GREETING BAND
      // ════════════════════════════════════════════════════════

      // Warm cream background
      doc.rect(0, 148, 595, 72).fill("#fff7ed");

      // Thick left accent
      doc.rect(0, 148, 6, 72).fill(COLORS.primary);

      // Large faded decorative glyph (top-right corner)
      doc
        .fillColor(COLORS.primary)
        .opacity(0.07)
        .font("Helvetica-Bold")
        .fontSize(64)
        .text("✦", 490, 143, { lineBreak: false });
      doc.opacity(1);

      // "Hello, [Property Name]!" — large warm heading
      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(15.5)
        .text(`Hello, ${propertyName}!`, 22, 158, { width: 480 });

      // Sub-line 1
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica")
        .fontSize(9.5)
        .text(
          "Great news — a new booking has just been confirmed through Bonfire Escape.",
          22,
          178,
          { width: 520 }
        );

      // Sub-line 2 (lighter)
      doc
        .fillColor(COLORS.textLight)
        .font("Helvetica")
        .fontSize(8.2)
        .text(
          "Please review the details below and prepare your property accordingly. We look forward to a wonderful stay!",
          22,
          191,
          { width: 520 }
        );

      // ── Section divider ────────────────────────────────────
      doc
        .moveTo(40, 222)
        .lineTo(555, 222)
        .strokeColor(COLORS.border)
        .lineWidth(0.8)
        .stroke();

      // ════════════════════════════════════════════════════════
      //  PROPERTY CARD  (left)  +  STAY SNAPSHOT  (right)
      // ════════════════════════════════════════════════════════
      const blockY = 232;

      // ── Property card ──────────────────────────────────────
      doc.rect(40, blockY, 238, 95).fill(COLORS.grayLight);
      doc.rect(40, blockY, 4, 95).fill(COLORS.primary);

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("PROPERTY", 52, blockY + 8);

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(booking.propertyId.name, 52, blockY + 20, { width: 214 });

      doc.font("Helvetica").fontSize(7.8).fillColor(COLORS.textLight);
      doc.text(`${booking.propertyId.address},`, 52, blockY + 35, {
        width: 214,
      });
      doc.text(
        `${booking.propertyId.city}, ${booking.propertyId.state} — ${booking.propertyId.pincode}`,
        52,
        blockY + 46,
        { width: 214 }
      );
      doc.text(
        `GSTIN: ${
          booking.propertyId?.documentVerification?.GSTIN?.gstin || "N/A"
        }`,
        52,
        blockY + 57,
        { width: 214 }
      );

      // ── Snapshot card ──────────────────────────────────────
      doc.rect(292, blockY, 263, 95).fill(COLORS.grayLight);
      doc.rect(292, blockY, 4, 95).fill(COLORS.primaryDark);

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("STAY SNAPSHOT", 304, blockY + 8);

      const snap = [
        ["Check-In", formatDate(booking.checkInDate)],
        ["Check-Out", formatDate(booking.checkOutDate)],
        [
          "Duration",
          `${nights} Night${nights !== 1 ? "s" : ""}  ·  ${
            booking.numberOfGuests.adults
          } Adults, ${booking.numberOfGuests.children?.length || 0} Kids`,
        ],
        ["Pricing Type", booking.pricingType || "NIGHT"],
        ["Payment Mode", (booking.paymentMode || "N/A").replace("_", " ")],
      ];

      let snapY = blockY + 20;
      snap.forEach(([label, value]) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(7.8)
          .fillColor(COLORS.textDark)
          .text(`${label}:`, 304, snapY, { width: 80 });

        doc
          .font("Helvetica")
          .fontSize(7.8)
          .fillColor(COLORS.textLight)
          .text(value, 390, snapY, { width: 155 });

        snapY += 13;
      });

      // ════════════════════════════════════════════════════════
      //  GUEST INFORMATION
      // ════════════════════════════════════════════════════════
      const guestY = blockY + 108;

      doc.rect(40, guestY, 515, 20).fill(COLORS.primary);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("GUEST INFORMATION", 50, guestY + 6);

      doc.rect(40, guestY + 20, 515, 26).fill("#fff7ed");

      const g = booking.primaryGuestDetails;

      // Row 1 — name / email / phone
      doc.font("Helvetica-Bold").fontSize(7.8).fillColor(COLORS.textDark);
      doc.text("Name:", 50, guestY + 27);
      doc
        .font("Helvetica")
        .fillColor(COLORS.textLight)
        .text(g.fullName, 80, guestY + 27, { width: 120 });

      doc
        .font("Helvetica-Bold")
        .fillColor(COLORS.textDark)
        .text("Email:", 215, guestY + 27);
      doc
        .font("Helvetica")
        .fillColor(COLORS.textLight)
        .text(g.email || "N/A", 244, guestY + 27, { width: 135 });

      doc
        .font("Helvetica-Bold")
        .fillColor(COLORS.textDark)
        .text("Phone:", 392, guestY + 27);
      doc
        .font("Helvetica")
        .fillColor(COLORS.textLight)
        .text(g.phone, 422, guestY + 27, { width: 125 });

      // Row 2 — address (only if present)
      if (g.address) {
        doc
          .font("Helvetica-Bold")
          .fontSize(7.8)
          .fillColor(COLORS.textDark)
          .text("Address:", 50, guestY + 40);
        doc
          .font("Helvetica")
          .fillColor(COLORS.textLight)
          .text(
            `${g.address}${g.city ? ", " + g.city : ""}${
              g.country ? ", " + g.country : ""
            }`,
            95,
            guestY + 39,
            { width: 455 }
          );
      }

      // ════════════════════════════════════════════════════════
      //  BOOKING DETAILS TABLE
      // ════════════════════════════════════════════════════════
      const tableTop = guestY + 58;

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text("BOOKING DETAILS", 40, tableTop);

      const col = {
        desc: 40,
        type: 218,
        qty: 264,
        unitPrice: 292,
        disc: 384,
        total: 466,
      };

      // Header row
      doc.rect(40, tableTop + 14, 515, 20).fill(COLORS.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);

      doc.text("ROOM NAME", col.desc + 8, tableTop + 20);
      doc.text("TYPE", col.type, tableTop + 20, { width: 44, align: "center" });
      doc.text("QTY", col.qty, tableTop + 20, { width: 26, align: "center" });
      doc.text(
        booking.pricingType === "NIGHT" ? "RATE/NIGHT" : "PKG PRICE",
        col.unitPrice,
        tableTop + 20,
        { width: 86, align: "right" }
      );
      doc.text("DISCOUNT", col.disc, tableTop + 20, {
        width: 78,
        align: "right",
      });
      doc.text("TOTAL", col.total, tableTop + 20, {
        width: 82,
        align: "right",
      });

      let rowY = tableTop + 44;

      if (!booking.rooms || booking.rooms.length === 0) {
        doc
          .fillColor(COLORS.textDark)
          .fontSize(9)
          .text("No room details available.", 40, rowY);
      } else {
        booking.rooms.forEach((room, idx) => {
          doc
            .rect(40, rowY - 3, 515, 20)
            .fill(idx % 2 === 0 ? "#fff7ed" : "#ffffff");

          const discount = room.discount || 0;
          const unitPrice =
            booking.pricingType === "NIGHT"
              ? room.pricePerNight || 0
              : room.packagePrice || 0;
          const qty = room.quantity || 1;
          let lineTotal = (unitPrice - discount) * qty;
          if (booking.pricingType === "NIGHT") lineTotal *= nights;

          doc
            .fillColor(COLORS.textDark)
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(room.roomId.name, col.desc + 8, rowY, {
              width: 172,
              ellipsis: true,
            });
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(COLORS.textLight)
            .text(
              (room.roomId?.typeOfRoom || "N/A").toString(),
              col.type,
              rowY,
              { width: 44, align: "center" }
            );
          doc.text(qty.toString(), col.qty, rowY, {
            width: 26,
            align: "center",
          });
          doc.text(formatCurrency(unitPrice), col.unitPrice, rowY, {
            width: 86,
            align: "right",
          });
          doc.text(formatCurrency(discount), col.disc, rowY, {
            width: 78,
            align: "right",
          });
          doc
            .fillColor(COLORS.textDark)
            .font("Helvetica-Bold")
            .text(formatCurrency(lineTotal), col.total, rowY, {
              width: 82,
              align: "right",
            });

          rowY += 18;

          if (room.extraServices?.length) {
            room.extraServices.forEach((service) => {
              const serviceTotal = (service.fee || 0) * qty;
              doc
                .fillColor(COLORS.textLight)
                .font("Helvetica")
                .fontSize(7.5)
                .text(`   + ${service.name}`, col.desc + 18, rowY, {
                  width: 170,
                });
              doc.text(formatCurrency(serviceTotal), col.total, rowY, {
                width: 82,
                align: "right",
              });
              rowY += 11;
            });
          }

          doc
            .moveTo(40, rowY + 2)
            .lineTo(555, rowY + 2)
            .strokeColor(COLORS.border)
            .lineWidth(0.5)
            .stroke();
          rowY += 12;
        });
      }

      // ════════════════════════════════════════════════════════
      //  PRICE SUMMARY  (right-aligned block)
      // ════════════════════════════════════════════════════════
      if (rowY > 640) {
        doc.addPage();
        rowY = 50;
      }

      rowY += 8;
      const sumX = 335;
      const sumLabelW = 115;
      const sumValueW = 105;
      const sumTotalW = sumLabelW + sumValueW; // 220

      // Light card behind summary
      doc.rect(sumX - 8, rowY - 6, sumTotalW + 16, 118).fill(COLORS.grayLight);

      const summaryRows = [
        ["Base Subtotal", booking.priceBreakdown.basePrice],
        ["Total Discounts", booking.priceBreakdown.discountAmount],
        ["Extra Services Fee", booking.priceBreakdown.extraServicesFee],
      ];

      if (booking.priceBreakdown.childrenCharge) {
        summaryRows.push([
          "Children Charges",
          booking.priceBreakdown.childrenCharge,
        ]);
      }

      summaryRows.push(["GST (Taxes)", booking.priceBreakdown.gst_amount]);

      summaryRows.forEach(([label, value]) => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.textLight)
          .text(label, sumX, rowY, { width: sumLabelW });
        doc.text(formatCurrency(value), sumX + sumLabelW, rowY, {
          width: sumValueW,
          align: "right",
        });

        doc
          .moveTo(sumX, rowY + 11)
          .lineTo(sumX + sumTotalW, rowY + 11)
          .strokeColor(COLORS.border)
          .lineWidth(0.4)
          .stroke();

        rowY += 14;
      });

      rowY += 4;
      doc
        .roundedRect(sumX - 8, rowY, sumTotalW + 16, 26, 5)
        .fill(COLORS.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text("GRAND TOTAL", sumX, rowY + 8, { width: sumLabelW });

      doc.text(formatCurrency(booking.totalPrice), sumX + sumLabelW, rowY + 8, {
        width: sumValueW,
        align: "right",
      });

      // ── Special Requests ───────────────────────────────────
      if (booking.specialRequests) {
        rowY += 38;
        doc.rect(40, rowY, 515, 14).fill(COLORS.lightBg);
        doc.rect(40, rowY, 4, 14).fill(COLORS.primary);
        doc
          .fillColor(COLORS.primaryDark)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text("SPECIAL REQUESTS FROM GUEST", 50, rowY + 3);

        rowY += 18;
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.textDark)
          .text(booking.specialRequests, 50, rowY, { width: 500 });
        rowY += doc.heightOfString(booking.specialRequests, { width: 500 }) + 8;
      }

      // ════════════════════════════════════════════════════════
      //  FOOTER
      // ════════════════════════════════════════════════════════
      const footerY = Math.max(rowY + 28, 692);

      doc
        .moveTo(40, footerY)
        .lineTo(555, footerY)
        .strokeColor(COLORS.primary)
        .lineWidth(1.5)
        .stroke();

      // ── Payment Info ───────────────────────────────────────
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PAYMENT INFO", 40, footerY + 10);

      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textLight);
      doc.text(
        `Mode: ${(booking.paymentMode || "N/A").replace("_", " ")}`,
        40,
        footerY + 22
      );
      doc.text(
        `Status: ${booking.paymentStatus.toUpperCase()}`,
        40,
        footerY + 33
      );

      if (isPaid && booking.paymentMode === "PAY_NOW") {
        doc.text(
          `Txn ID: ${booking.payment?.razorpayPaymentId || "N/A"}`,
          40,
          footerY + 44
        );
      } else {
        doc.text(
          "Guest pays on arrival — collect at check-in.",
          40,
          footerY + 44
        );
      }

      // ── Cancellation Policy ────────────────────────────────
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("CANCELLATION POLICY", 220, footerY + 10);

      const policies = booking.propertyId.policies?.cancellationPolicy || [];
      let polY = footerY + 22;

      if (policies.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(COLORS.textLight)
          .text("No cancellation policy configured.", 220, polY);
      } else {
        policies.forEach((p) => {
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(COLORS.textLight)
            .text(
              `• ${p.daysBeforeCheckIn} days before — ${p.refundPercentage}% refund`,
              220,
              polY
            );
          polY += 10;
        });
      }

      // ── Timings ────────────────────────────────────────────
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("TIMINGS", 420, footerY + 10);

      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textLight);
      doc.text(
        `Check-In : ${booking.propertyId.policies?.checkInTime || "2:00 PM"}`,
        420,
        footerY + 22
      );
      doc.text(
        `Check-Out: ${booking.propertyId.policies?.checkOutTime || "12:00 PM"}`,
        420,
        footerY + 33
      );

      // ── Bottom tagline ─────────────────────────────────────
      doc
        .fontSize(7)
        .fillColor(COLORS.textLight)
        .text(
          "Bonfire Escape — Auto-generated partner booking notice. Please do not reply to this document.",
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
