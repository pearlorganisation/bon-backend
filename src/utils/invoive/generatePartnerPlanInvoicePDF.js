// import PDFDocument from "pdfkit";
// import { format } from "date-fns";
// import fs from "fs";
// import path from "path";
// import { uploadFileToCloudinary } from "../cloudinary.js";

// // 🎨 UI COLORS (Same as booking invoice)
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
// };

// const formatDate = (dateStr) => {
//   if (!dateStr) return "N/A";
//   const date = new Date(dateStr);
//   return `${String(date.getDate()).padStart(2, "0")}/${String(
//     date.getMonth() + 1
//   ).padStart(2, "0")}/${date.getFullYear()}`;
// };


// const formatCurrency = (amount, sign = "") => {
//   const num = amount || 0;
//   const formatted = num.toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
//   return `${sign}Rs. ${formatted}`;
// };

// export const generatePartnerPlanInvoicePDF = async (
//   plan,
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
//           originalname: `${invoiceNumber}.pdf`,
//         };
//         const [uploaded] = await uploadFileToCloudinary(
//           file,
//           "/PartnerInvoices"
//         );
//         resolve(uploaded ? uploaded.secure_url : null);
//       } catch (error) {
//         reject(error);
//       }
//     });

//     try {
//       const isSubscription = plan.PlanType === "SUBSCRIPTION";
//       const isCommission = plan.PlanType === "COMMISSION";

//       // Check if payment is done for subscription only
//       const isPaid = isSubscription
//         ? plan.subscriptionPayment?.paymentId
//           ? true
//           : false
//         : false; // Commission plans don't show payment status

//       // Get invoice title based on plan type
//       const invoiceTitle = isCommission
//         ? "COMMISSION PLAN INVOICE"
//         : "SUBSCRIPTION PLAN INVOICE";

//       // ================= HEADER =================
//       doc.rect(0, 0, 595, 110).fill(COLORS.primary);

//       const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
//       if (fs.existsSync(logoPath)) {
//         doc.image(logoPath, 40, 20, { width: 70 });
//       }
      
//       doc
//         .fillColor("#ffffff")
//         .fontSize(18)
//         .font("Helvetica-Bold")
//         .text(invoiceTitle, 400, isSubscription ? 20 : 35, { align: "right" });

//       // Only show status badge for subscription plans
//       if (isSubscription) {
//         const statusColor = isPaid ? COLORS.success : COLORS.danger;
//         doc.roundedRect(455, 60, 95, 20, 4).fill(statusColor);

//         doc
//           .fillColor("#FFFFFF")
//           .fontSize(9)
//           .font("Helvetica-Bold")
//           .text(isPaid ? "PAID" : "PAYMENT DUE", 455, 65, {
//             width: 95,
//             align: "center",
//           });
//       }

//       doc.fillColor("#ffffff").font("Helvetica").fontSize(8);
//       doc.text(`Invoice Number: ${invoiceNumber}`, 400, 88, {
//         align: "right",
//       });
//       doc.text(
//         `Invoice Date: ${formatDate(plan.createdAt || new Date())}`,
//         400,
//         100,
//         { align: "right" }
//       );

//       // ================= DIVIDER =================
//       doc.moveTo(40, 125).lineTo(555, 125).strokeColor(COLORS.border).stroke();

//       // ================= PARTNER DETAILS CARD =================
//       const partner = plan.partnerId;

//       doc
//         .roundedRect(40, 140, 250, 95, 6)
//         .fill(COLORS.lightBg)
//         .strokeColor(COLORS.border)
//         .stroke();

//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(10)
//         .text("PARTNER DETAILS", 50, 150);

//       doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

//       doc.text(`Name: ${partner?.name || "N/A"}`, 50, 170);
//       doc.text(`Email: ${partner?.email || "N/A"}`, 50, 185);
//       doc.text(`Phone: ${partner?.phoneNumber || "N/A"}`, 50, 200);
//       doc.text(
//         `Partner Since: ${formatDate(partner?.createdAt || plan.createdAt)}`,
//         50,
//         215
//       );

//       // ================= PLAN DETAILS CARD =================
//       doc
//         .roundedRect(305, 140, 250, 95, 6)
//         .fill(COLORS.lightBg)
//         .strokeColor(COLORS.border)
//         .stroke();

//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(10)
//         .text("PLAN DETAILS", 315, 150);

//       doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

//       doc.text(`Plan Type: ${plan.PlanType}`, 315, 170);
//       doc.text(`Status: ${plan.planStatus}`, 315, 185);
//       doc.text(`Start Date: ${formatDate(plan.startDate)}`, 315, 200);
//       doc.text(`End Date: ${formatDate(plan.endDate)}`, 315, 215);

//       // ================= PLAN SPECIFIC CONTENT =================
//       let currentY = 255;

//       if (isCommission) {
//         // COMMISSION PLAN SECTION
//         const partnerCommissionRate = plan.commissionPercentage || 0;

//         doc
//           .roundedRect(40, currentY, 515, 80, 6)
//           .fill(COLORS.lightBg)
//           .strokeColor(COLORS.border)
//           .stroke();

//         doc
//           .fillColor(COLORS.primaryDark)
//           .font("Helvetica-Bold")
//           .fontSize(10)
//           .text("COMMISSION STRUCTURE", 50, currentY + 10);

//         doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

//         doc.text(
//           `Commission Rate: ${partnerCommissionRate}% of each booking value`,
//           50,
//           currentY + 35
//         );

//         doc.text(
//           `This commission will be deducted from your payouts for every booking completed through the platform.`,
//           50,
//           currentY + 55
//         );

//         currentY += 100;
//       } else if (isSubscription) {
//         // SUBSCRIPTION PLAN SECTION
//         const subscriptionPlan = plan.subscriptionPlanId;
//         const payment = plan.subscriptionPayment || {};

//         // Use the exact totalAmount from payment object
//         const baseAmount = subscriptionPlan?.price || 0;
//         const gstRate = payment.gstRate || 18;
//         const gstAmount = payment.gstAmount || (baseAmount * gstRate) / 100;
//         const totalAmount = payment.totalAmount || baseAmount + gstAmount;

//         doc
//           .roundedRect(40, currentY, 515, 130, 6)
//           .fill(COLORS.lightBg)
//           .strokeColor(COLORS.border)
//           .stroke();

//         doc
//           .fillColor(COLORS.primaryDark)
//           .font("Helvetica-Bold")
//           .fontSize(10)
//           .text("SUBSCRIPTION DETAILS", 50, currentY + 10);

//         doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

//         doc.text(
//           `Plan Name: ${subscriptionPlan?.name || "N/A"}`,
//           50,
//           currentY + 35
//         );
//         doc.text(
//           `Plan Duration: ${subscriptionPlan?.durationDays || 30} Days`,
//           50,
//           currentY + 55
//         );
//         doc.text(
//           `Subscription Fee: ${formatCurrency(baseAmount)}`,
//           50,
//           currentY + 75
//         );
//         doc.text(
//           `GST (${gstRate}%): ${formatCurrency(gstAmount)}`,
//           50,
//           currentY + 95
//         );

//         // Draw a line separator
//         doc
//           .moveTo(50, currentY + 108)
//           .lineTo(250, currentY + 108)
//           .strokeColor(COLORS.primary)
//           .stroke();

//         doc
//           .fillColor(COLORS.primary)
//           .font("Helvetica-Bold")
//           .fontSize(10)
//           .text(
//             `Total Amount: ${formatCurrency(totalAmount)}`,
//             50,
//             currentY + 118
//           );

//         // Payment Status Section
//         if (payment.paymentId) {
//           doc
//             .fillColor(COLORS.success)
//             .font("Helvetica-Bold")
//             .text(` PAYMENT COMPLETED`, 350, currentY + 35);
//           doc
//             .fillColor(COLORS.textLight)
//             .fontSize(8)
//             .text(`Transaction ID: ${payment.paymentId}`, 350, currentY + 55);
        
//           doc.text(
//             `Payment Date: ${formatDate(plan.updatedAt || new Date())}`,
//             350,
//             currentY + 85
//           );
//         } else {
//           doc
//             .fillColor(COLORS.danger)
//             .font("Helvetica-Bold")
//             .text(`PAYMENT PENDING`, 350, currentY + 35);
//           doc
//             .fillColor(COLORS.textLight)
//             .fontSize(8)
//             .text(
//               `Amount Due: ${formatCurrency(totalAmount)}`,
//               350,
//               currentY + 55
//             );
//           doc.text(
//             `Please complete payment to activate your subscription plan`,
//             350,
//             currentY + 75
//           );
//         }

//         currentY += 155;
//       }

//       // ================= THANK YOU MESSAGE =================
//       doc.roundedRect(40, currentY, 515, 50, 6).fill(COLORS.primary);

//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica-Bold")
//         .fontSize(11)
//         .text(
//           "THANK YOU FOR PARTNERING WITH BONFIRE ESCAPES",
//           40,
//           currentY + 18,
//           {
//             align: "center",
//             width: 515,
//           }
//         );

//       doc
//         .fillColor("#ffffff")
//         .font("Helvetica")
//         .fontSize(8)
//         .text(
//           isCommission
//             ? "We look forward to a successful partnership. Start listing your properties today!"
//             : "Your subscription is now active. Enjoy zero commission on all bookings during your subscription period!",
//           40,
//           currentY + 35,
//           { align: "center", width: 515 }
//         );

//       currentY += 70;

//       // ================= PLAN BENEFITS SECTION =================
//       const benefitsTop = currentY;

//       doc
//         .fillColor(COLORS.primaryDark)
//         .font("Helvetica-Bold")
//         .fontSize(10)
//         .text("KEY BENEFITS", 40, benefitsTop);

//       currentY += 20;

//       if (isCommission) {
//         // Commission Plan Benefits
//         const partnerCommissionRate = plan.commissionPercentage || 0;
//         const benefits = [
//           `• ${partnerCommissionRate}% commission will be deducted per booking`,
//           "• No monthly or annual subscription fees",
//           "• Pay only when you earn from bookings",
//           "• 24/7 priority customer support",
//         ];

//         let benefitY = currentY;
//         benefits.forEach((benefit) => {
//           doc
//             .fillColor(COLORS.textDark)
//             .font("Helvetica")
//             .fontSize(8)
//             .text(benefit, 50, benefitY);
//           benefitY += 15;
//         });

//         currentY = benefitY + 20;
//       } else {
//         // Subscription Plan Benefits
//         const subscriptionPlan = plan.subscriptionPlanId;
//         const duration = subscriptionPlan?.durationDays || 30;
//         const benefits = [
//           `• Zero commission on all bookings for ${duration} days`,
//           "• 100% of booking amount goes to you",
//           "• 24/7 priority customer support",
//         ];

//         let benefitY = currentY;
//         benefits.forEach((benefit) => {
//           doc
//             .fillColor(COLORS.textDark)
//             .font("Helvetica")
//             .fontSize(8)
//             .text(benefit, 50, benefitY);
//           benefitY += 15;
//         });

//         currentY = benefitY + 20;
//       }

//       // ================= INVOICE SUMMARY SECTION =================
//       if (isSubscription && plan.subscriptionPayment?.paymentId) {
//         doc
//           .roundedRect(40, currentY, 515, 45, 6)
//           .fill(COLORS.lightBg)
//           .strokeColor(COLORS.border)
//           .stroke();

//         doc
//           .fillColor(COLORS.textDark)
//           .font("Helvetica-Bold")
//           .fontSize(8)
//           .text("INVOICE SUMMARY", 50, currentY + 10);

//         doc
//           .fillColor(COLORS.textLight)
//           .font("Helvetica")
//           .fontSize(8)
//           .text(
//             `This is a computer-generated invoice for the subscription plan purchased.`,
//             50,
//             currentY + 25
//           );

//         doc
//           .fillColor(COLORS.textLight)
//           .fontSize(7)
//           .text(
//             `For any queries regarding this invoice, please contact partner support.`,
//             50,
//             currentY + 38
//           );

//         currentY += 65;
//       }

//       // ================= FOOTER =================
//       const footerTop = Math.max(currentY, 680);

//       doc
//         .moveTo(40, footerTop)
//         .lineTo(555, footerTop)
//         .strokeColor(COLORS.primary)
//         .stroke();

//       doc
//         .fontSize(7)
//         .fillColor(COLORS.textLight)
//         .text(
//           "Bonfire Luxury Stays - Computer Generated Partner Invoice",
//           40,
//           footerTop + 8,
//           {
//             align: "center",
//             width: 515,
//           }
//         );

//       doc
//         .fontSize(6)
//         .fillColor(COLORS.textLight)
//         .text(
//           "This invoice is system generated and does not require physical signature.",
//           40,
//           footerTop + 20,
//           {
//             align: "center",
//             width: 515,
//           }
//         );

//       doc.end();
//     } catch (err) {
//       reject(err);
//     }
//   });
// };


import PDFDocument from "pdfkit";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../cloudinary.js";
import { getPlatformSettings } from "./createInvoice.js";

// 🎨 UI COLORS (Same as booking invoice)
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

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatCurrency = (amount, sign = "") => {
  const num = amount || 0;
  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}Rs. ${formatted}`;
};

export const generatePartnerPlanInvoicePDF = async (plan, invoiceNumber) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    const buffers = [];

    // Track current Y position
    let currentY = 40;

    // Helper: Check if we have enough space on current page
    const checkPageSpace = (requiredHeight) => {
      const pageHeight = 842; // A4 height in points
      const bottomMargin = 40;
      const availableSpace = pageHeight - currentY - bottomMargin;

      if (availableSpace < requiredHeight) {
        doc.addPage();
        currentY = 40; // Reset to top margin on new page
        return false;
      }
      return true;
    };

    // Helper: Add spacing and check page space before rendering section
    const prepareSection = (requiredHeight, additionalSpacing = 15) => {
      currentY += additionalSpacing;
      const hadSpace = checkPageSpace(requiredHeight);
      if (!hadSpace) {
        currentY += additionalSpacing;
      }
      return currentY;
    };

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const file = {
          buffer: pdfBuffer,
          mimetype: "application/pdf",
          originalname: `${invoiceNumber}.pdf`,
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
      // Get platform settings for footer
      const platformSettings = await getPlatformSettings();
      const supportEmail = platformSettings?.supportEmail || null;
      const supportPhone = platformSettings?.supportPhone || null;
      const websiteName = platformSettings?.websiteName || "Bonfire Escape";
      const copyrightText =
        platformSettings?.copyrightText ||
        `© ${new Date().getFullYear()} Bonfire Escape. All rights reserved.`;
      const socialLinks = platformSettings?.socialLinks || {};

      const isSubscription = plan.PlanType === "SUBSCRIPTION";
      const isCommission = plan.PlanType === "COMMISSION";

      // Check if payment is done for subscription only
      const isPaid = isSubscription
        ? plan.subscriptionPayment?.paymentId
          ? true
          : false
        : false; // Commission plans don't show payment status

      // Get invoice title based on plan type
      const invoiceTitle = isCommission
        ? "COMMISSION PLAN INVOICE"
        : "SUBSCRIPTION PLAN INVOICE";

      // ================= SECTION 1: HEADER =================
      const headerHeight = 110;
      doc.rect(0, 0, 595, headerHeight).fill(COLORS.primary);

      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 20, { width: 70 });
      }

      doc
        .fillColor("#ffffff")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(invoiceTitle, 400, isSubscription ? 20 : 35, { align: "right" });

      // Only show status badge for subscription plans
      if (isSubscription) {
        const statusColor = isPaid ? COLORS.success : COLORS.danger;
        doc.roundedRect(455, 60, 95, 20, 4).fill(statusColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(isPaid ? "PAID" : "PAYMENT DUE", 455, 65, {
            width: 95,
            align: "center",
          });
      }

      doc.fillColor("#ffffff").font("Helvetica").fontSize(8);
      doc.text(`Invoice Number: ${invoiceNumber}`, 400, 88, {
        align: "right",
      });
      doc.text(
        `Invoice Date: ${formatDate(plan.createdAt || new Date())}`,
        400,
        100,
        { align: "right" }
      );

      currentY = headerHeight + 15;

      // ================= SECTION 2: DIVIDER =================
      doc
        .moveTo(40, currentY)
        .lineTo(555, currentY)
        .strokeColor(COLORS.border)
        .stroke();
      currentY += 15;

      // ================= SECTION 3: PARTNER DETAILS CARD =================
      const cardHeight = 95;
      prepareSection(cardHeight, 0);

      const partner = plan.partnerId;

      doc
        .roundedRect(40, currentY, 250, cardHeight, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("PARTNER DETAILS", 50, currentY + 10);

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

      doc.text(`Name: ${partner?.name || "N/A"}`, 50, currentY + 30);
      doc.text(`Email: ${partner?.email || "N/A"}`, 50, currentY + 45);
      doc.text(`Phone: ${partner?.phoneNumber || "N/A"}`, 50, currentY + 60);
      doc.text(
        `Partner Since: ${formatDate(partner?.createdAt || plan.createdAt)}`,
        50,
        currentY + 75
      );

      // ================= SECTION 4: PLAN DETAILS CARD =================
      doc
        .roundedRect(305, currentY, 250, cardHeight, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("PLAN DETAILS", 315, currentY + 10);

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

      doc.text(`Plan Type: ${plan.PlanType}`, 315, currentY + 30);
      doc.text(`Status: ${plan.planStatus}`, 315, currentY + 45);
      doc.text(`Start Date: ${formatDate(plan.startDate)}`, 315, currentY + 60);
      doc.text(`End Date: ${formatDate(plan.endDate)}`, 315, currentY + 75);

      currentY += cardHeight;

      // ================= SECTION 5: PLAN SPECIFIC CONTENT =================
      if (isCommission) {
        // COMMISSION PLAN SECTION
        const commissionHeight = 80;
        prepareSection(commissionHeight, 15);

        const partnerCommissionRate = plan.commissionPercentage || 0;

        doc
          .roundedRect(40, currentY, 515, commissionHeight, 6)
          .fill(COLORS.lightBg)
          .strokeColor(COLORS.border)
          .stroke();

        doc
          .fillColor(COLORS.primaryDark)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text("COMMISSION STRUCTURE", 50, currentY + 10);

        doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

        doc.text(
          `Commission Rate: ${partnerCommissionRate}% of each booking value`,
          50,
          currentY + 35
        );

        doc.text(
          `This commission will be deducted from your payouts for every booking completed through the platform.`,
          50,
          currentY + 55
        );

        currentY += commissionHeight + 10;
      } else if (isSubscription) {
        // SUBSCRIPTION PLAN SECTION
        const subscriptionHeight = 130;
        prepareSection(subscriptionHeight, 15);

        const subscriptionPlan = plan.subscriptionPlanId;
        const payment = plan.subscriptionPayment || {};

        // Use the exact totalAmount from payment object
        const baseAmount = subscriptionPlan?.price || 0;
        const gstRate = payment.gstRate || 18;
        const gstAmount = payment.gstAmount || (baseAmount * gstRate) / 100;
        const totalAmount = payment.totalAmount || baseAmount + gstAmount;

        doc
          .roundedRect(40, currentY, 515, subscriptionHeight, 6)
          .fill(COLORS.lightBg)
          .strokeColor(COLORS.border)
          .stroke();

        doc
          .fillColor(COLORS.primaryDark)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text("SUBSCRIPTION DETAILS", 50, currentY + 10);

        doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

        doc.text(
          `Plan Name: ${subscriptionPlan?.name || "N/A"}`,
          50,
          currentY + 35
        );
        doc.text(
          `Plan Duration: ${subscriptionPlan?.durationDays || 30} Days`,
          50,
          currentY + 55
        );
        doc.text(
          `Subscription Fee: ${formatCurrency(baseAmount)}`,
          50,
          currentY + 75
        );
        doc.text(
          `GST (${gstRate}%): ${formatCurrency(gstAmount)}`,
          50,
          currentY + 95
        );

        // Draw a line separator
        doc
          .moveTo(50, currentY + 108)
          .lineTo(250, currentY + 108)
          .strokeColor(COLORS.primary)
          .stroke();

        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(
            `Total Amount: ${formatCurrency(totalAmount)}`,
            50,
            currentY + 118
          );

        // Payment Status Section
        if (payment.paymentId) {
          doc
            .fillColor(COLORS.success)
            .font("Helvetica-Bold")
            .text(`PAYMENT COMPLETED`, 350, currentY + 35);
          doc
            .fillColor(COLORS.textLight)
            .fontSize(8)
            .text(`Transaction ID: ${payment.paymentId}`, 350, currentY + 55);

          doc.text(
            `Payment Date: ${formatDate(plan.updatedAt || new Date())}`,
            350,
            currentY + 85
          );
        } else {
          doc
            .fillColor(COLORS.danger)
            .font("Helvetica-Bold")
            .text(`PAYMENT PENDING`, 350, currentY + 35);
          doc
            .fillColor(COLORS.textLight)
            .fontSize(8)
            .text(
              `Amount Due: ${formatCurrency(totalAmount)}`,
              350,
              currentY + 55
            );
          doc.text(
            `Please complete payment to activate your subscription plan`,
            350,
            currentY + 75
          );
        }

        currentY += subscriptionHeight + 15;
      }

      // ================= SECTION 6: THANK YOU MESSAGE =================
      const thankYouHeight = 50;
      prepareSection(thankYouHeight, 5);

      doc
        .roundedRect(40, currentY, 515, thankYouHeight, 6)
        .fill(COLORS.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
          "THANK YOU FOR PARTNERING WITH BONFIRE ESCAPES",
          40,
          currentY + 18,
          {
            align: "center",
            width: 515,
          }
        );

      doc
        .fillColor("#ffffff")
        .font("Helvetica")
        .fontSize(8)
        .text(
          isCommission
            ? "We look forward to a successful partnership. Start listing your properties today!"
            : "Your subscription is now active. Enjoy zero commission on all bookings during your subscription period!",
          40,
          currentY + 35,
          { align: "center", width: 515 }
        );

      currentY += thankYouHeight + 15;

      // ================= SECTION 7: PLAN BENEFITS SECTION =================
      let benefitsHeight = 20;
      if (isCommission) {
        benefitsHeight = 20 + 4 * 15; // 4 benefits
      } else {
        benefitsHeight = 20 + 3 * 15; // 3 benefits
      }

      prepareSection(benefitsHeight, 5);

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("KEY BENEFITS", 40, currentY);

      currentY += 20;

      if (isCommission) {
        // Commission Plan Benefits
        const partnerCommissionRate = plan.commissionPercentage || 0;
        const benefits = [
          `• ${partnerCommissionRate}% commission will be deducted per booking`,
          "• No monthly or annual subscription fees",
          "• Pay only when you earn from bookings",
          "• 24/7 priority customer support",
        ];

        let benefitY = currentY;
        benefits.forEach((benefit) => {
          doc
            .fillColor(COLORS.textDark)
            .font("Helvetica")
            .fontSize(8)
            .text(benefit, 50, benefitY);
          benefitY += 15;
        });

        currentY = benefitY + 10;
      } else {
        // Subscription Plan Benefits
        const subscriptionPlan = plan.subscriptionPlanId;
        const duration = subscriptionPlan?.durationDays || 30;
        const benefits = [
          `• Zero commission on all bookings for ${duration} days`,
          "• 100% of booking amount goes to you",
          "• 24/7 priority customer support",
        ];

        let benefitY = currentY;
        benefits.forEach((benefit) => {
          doc
            .fillColor(COLORS.textDark)
            .font("Helvetica")
            .fontSize(8)
            .text(benefit, 50, benefitY);
          benefitY += 15;
        });

        currentY = benefitY + 10;
      }

      // ================= SECTION 8: INVOICE SUMMARY SECTION (Only for paid subscriptions) =================
      if (isSubscription && plan.subscriptionPayment?.paymentId) {
        const summaryHeight = 55;
        prepareSection(summaryHeight, 10);

        doc
          .roundedRect(40, currentY, 515, summaryHeight, 6)
          .fill(COLORS.lightBg)
          .strokeColor(COLORS.border)
          .stroke();

        doc
          .fillColor(COLORS.textDark)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("INVOICE SUMMARY", 50, currentY + 10);

        doc
          .fillColor(COLORS.textLight)
          .font("Helvetica")
          .fontSize(8)
          .text(
            `This is a computer-generated invoice for the subscription plan purchased.`,
            50,
            currentY + 25
          );

        doc
          .fillColor(COLORS.textLight)
          .fontSize(7)
          .text(
            `For any queries regarding this invoice, please contact partner support.`,
            50,
            currentY + 38
          );

        currentY += summaryHeight + 10;
      }

      // ================= SECTION 9: BOTTOM FOOTER (Same as customer booking) =================
      const bottomFooterHeight = 80;
      prepareSection(bottomFooterHeight, 15);

      doc
        .moveTo(40, currentY)
        .lineTo(555, currentY)
        .strokeColor(COLORS.primary)
        .lineWidth(1.5)
        .stroke();

      const footerContentY = currentY + 15;

      // Left Column - Contact
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("CONTACT", 40, footerContentY);

      if (supportEmail) {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica")
          .fontSize(7.5)
          .text(`${supportEmail}`, 40, footerContentY + 14, {
            link: `mailto:${supportEmail}`,
          });
      }

      if (supportPhone) {
        doc
          .fillColor(COLORS.textLight)
          .font("Helvetica")
          .fontSize(7)
          .text(`${supportPhone}`, 40, footerContentY + 26);
      }

      // Center Column - Website
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("WEBSITE", 200, footerContentY);

      doc
        .fillColor(COLORS.primary)
        .font("Helvetica")
        .fontSize(7.5)
        .text(`bonfireescapes.com`, 200, footerContentY + 14, {
          link: `https://bonfireescapes.com`,
        });

      // Right Column - Social Media
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("FOLLOW US", 420, footerContentY);

      const drawCircleIcon = (x, y, color, letter, link) => {
        const size = 14;
        const radius = size / 2;

        doc.save();
        doc
          .circle(x + radius, y + radius, radius)
          .fillColor(color)
          .fill();
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(letter, x + 3, y + 3);
        doc
          .rect(x, y, size, size)
          .fillOpacity(0)
          .fill()
          .link(x, y, size, size, link);
        doc.restore();
        return size + 8;
      };

      let iconX = 420;
      let iconY = footerContentY + 14;

      if (socialLinks.instagram) {
        iconX += drawCircleIcon(
          iconX,
          iconY,
          "#E4405F",
          "I",
          socialLinks.instagram
        );
      }
      if (socialLinks.facebook) {
        iconX += drawCircleIcon(
          iconX,
          iconY,
          "#1877F2",
          "f",
          socialLinks.facebook
        );
      }
      if (socialLinks.twitter) {
        iconX += drawCircleIcon(
          iconX,
          iconY,
          "#1DA1F2",
          "T",
          socialLinks.twitter
        );
      }
      if (socialLinks.linkedin) {
        iconX += drawCircleIcon(
          iconX,
          iconY,
          "#0A66C2",
          "in",
          socialLinks.linkedin
        );
      }
      if (socialLinks.whatsapp) {
        iconX += drawCircleIcon(
          iconX,
          iconY,
          "#25D366",
          "W",
          socialLinks.whatsapp
        );
      }

      currentY = footerContentY + 50;

      // ================= SECTION 10: COPYRIGHT =================
      const copyrightHeight = 30;
      prepareSection(copyrightHeight, 5);

      doc
        .fontSize(7)
        .fillColor(COLORS.textLight)
        .text(copyrightText, 40, currentY, { align: "center", width: 515 });

      doc
        .fontSize(6)
        .fillColor(COLORS.textLight)
        .text(
          "This is a computer-generated document and does not require a physical signature.",
          40,
          currentY + 12,
          { align: "center", width: 515 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};