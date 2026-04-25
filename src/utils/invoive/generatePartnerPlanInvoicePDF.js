import PDFDocument from "pdfkit";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../cloudinary.js";

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

export const generatePartnerPlanInvoicePDF = async (
  plan,
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

      // ================= HEADER =================
      doc.rect(0, 0, 595, 110).fill(COLORS.primary);

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

      // ================= DIVIDER =================
      doc.moveTo(40, 125).lineTo(555, 125).strokeColor(COLORS.border).stroke();

      // ================= PARTNER DETAILS CARD =================
      const partner = plan.partnerId;

      doc
        .roundedRect(40, 140, 250, 95, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("PARTNER DETAILS", 50, 150);

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

      doc.text(`Name: ${partner?.name || "N/A"}`, 50, 170);
      doc.text(`Email: ${partner?.email || "N/A"}`, 50, 185);
      doc.text(`Phone: ${partner?.phoneNumber || "N/A"}`, 50, 200);
      doc.text(
        `Partner Since: ${formatDate(partner?.createdAt || plan.createdAt)}`,
        50,
        215
      );

      // ================= PLAN DETAILS CARD =================
      doc
        .roundedRect(305, 140, 250, 95, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("PLAN DETAILS", 315, 150);

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight);

      doc.text(`Plan Type: ${plan.PlanType}`, 315, 170);
      doc.text(`Status: ${plan.planStatus}`, 315, 185);
      doc.text(`Start Date: ${formatDate(plan.startDate)}`, 315, 200);
      doc.text(`End Date: ${formatDate(plan.endDate)}`, 315, 215);

      // ================= PLAN SPECIFIC CONTENT =================
      let currentY = 255;

      if (isCommission) {
        // COMMISSION PLAN SECTION
        const partnerCommissionRate = plan.commissionPercentage || 0;

        doc
          .roundedRect(40, currentY, 515, 80, 6)
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

        currentY += 100;
      } else if (isSubscription) {
        // SUBSCRIPTION PLAN SECTION
        const subscriptionPlan = plan.subscriptionPlanId;
        const payment = plan.subscriptionPayment || {};

        // Use the exact totalAmount from payment object
        const baseAmount = subscriptionPlan?.price || 0;
        const gstRate = payment.gstRate || 18;
        const gstAmount = payment.gstAmount || (baseAmount * gstRate) / 100;
        const totalAmount = payment.totalAmount || baseAmount + gstAmount;

        doc
          .roundedRect(40, currentY, 515, 130, 6)
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
            .text(` PAYMENT COMPLETED`, 350, currentY + 35);
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

        currentY += 155;
      }

      // ================= THANK YOU MESSAGE =================
      doc.roundedRect(40, currentY, 515, 50, 6).fill(COLORS.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
          "THANK YOU FOR PARTNERING WITH BONFIRE LUXURY STAYS",
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

      currentY += 70;

      // ================= PLAN BENEFITS SECTION =================
      const benefitsTop = currentY;

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("KEY BENEFITS", 40, benefitsTop);

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

        currentY = benefitY + 20;
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

        currentY = benefitY + 20;
      }

      // ================= INVOICE SUMMARY SECTION =================
      if (isSubscription && plan.subscriptionPayment?.paymentId) {
        doc
          .roundedRect(40, currentY, 515, 45, 6)
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

        currentY += 65;
      }

      // ================= FOOTER =================
      const footerTop = Math.max(currentY, 680);

      doc
        .moveTo(40, footerTop)
        .lineTo(555, footerTop)
        .strokeColor(COLORS.primary)
        .stroke();

      doc
        .fontSize(7)
        .fillColor(COLORS.textLight)
        .text(
          "Bonfire Luxury Stays - Computer Generated Partner Invoice",
          40,
          footerTop + 8,
          {
            align: "center",
            width: 515,
          }
        );

      doc
        .fontSize(6)
        .fillColor(COLORS.textLight)
        .text(
          "This invoice is system generated and does not require physical signature.",
          40,
          footerTop + 20,
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
