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

const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(
    2,
    "0"
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const formatCurrency = (amount, sign = "") => {
  const num = amount || 0;
  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}₹ ${formatted}`;
};



export const generatePartnerPlanInvoicePDF = async (
  plan,
  commissionData,
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

      // Check if payment is done for subscription
      const isPaid = isSubscription
        ? plan.subscriptionPayment?.paymentId
          ? true
          : false
        : true; // Commission plans are always considered active

      // ================= HEADER =================
      doc.rect(0, 0, 595, 110).fill(COLORS.primary);

      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 20, { width: 70 });
      }

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("PARTNER INVOICE", 400, 30, { align: "right" });

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

      doc.fillColor("#ffffff").font("Helvetica").fontSize(8);
      doc.text(`Invoice Number: ${invoiceNumber}`, 400, 88, {
        align: "right",
      });
      doc.text(
        `Invoice Date: ${formatDateTime(plan.createdAt || new Date())}`,
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
        doc
          .roundedRect(40, currentY, 515, 80, 6)
          .fill(COLORS.lightBg)
          .strokeColor(COLORS.border)
          .stroke();

        doc
          .fillColor(COLORS.primaryDark)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text("COMMISSION PLAN DETAILS", 50, currentY + 10);

        doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

        doc.text(
          `Commission Rate: ${commissionData?.commission?.min || 10}% - ${
            commissionData?.commission?.max || 50
          }%`,
          50,
          currentY + 35
        );

        doc.text(
          `You earn commission on every booking made through your property listings.`,
          50,
          currentY + 55
        );

        doc
          .fillColor(COLORS.success)
          .text(`✓ No upfront payment required`, 50, currentY + 75);

        currentY += 100;
      } else if (isSubscription) {
        // SUBSCRIPTION PLAN SECTION
        const subscriptionPlan = plan.subscriptionPlanId;
        const payment = plan.subscriptionPayment || {};
        const totalAmount = payment.totalAmount || subscriptionPlan?.price || 0;
        const gstAmount = payment.gstAmount || totalAmount * 0.18;
        const gstRate = payment.gstRate || 18;

        doc
          .roundedRect(40, currentY, 515, 120, 6)
          .fill(COLORS.lightBg)
          .strokeColor(COLORS.border)
          .stroke();

        doc
          .fillColor(COLORS.primaryDark)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text("SUBSCRIPTION PLAN DETAILS", 50, currentY + 10);

        doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

        doc.text(
          `Plan Name: ${subscriptionPlan?.name || "N/A"}`,
          50,
          currentY + 35
        );
        doc.text(
          `Duration: ${subscriptionPlan?.durationDays || 30} Days`,
          50,
          currentY + 55
        );
        doc.text(
          `Plan Price: ${formatCurrency(subscriptionPlan?.price || 0)}`,
          50,
          currentY + 75
        );
        doc.text(
          `GST (${gstRate}%): ${formatCurrency(gstAmount)}`,
          50,
          currentY + 95
        );

        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .text(
            `Total Amount: ${formatCurrency(totalAmount + gstAmount)}`,
            50,
            currentY + 115
          );

        // Payment Status
        if (payment.paymentId) {
          doc
            .fillColor(COLORS.success)
            .text(`✓ Payment Completed`, 350, currentY + 35);
          doc
            .fillColor(COLORS.textLight)
            .fontSize(8)
            .text(`Payment ID: ${payment.paymentId}`, 350, currentY + 55);
          if (payment.orderId) {
            doc.text(`Order ID: ${payment.orderId}`, 350, currentY + 70);
          }
        } else {
          doc
            .fillColor(COLORS.danger)
            .text(`⚠ Payment Pending`, 350, currentY + 35);
          doc
            .fillColor(COLORS.textLight)
            .fontSize(8)
            .text(
              `Please complete payment to activate your plan`,
              350,
              currentY + 55
            );
        }

        currentY += 140;
      }

      // ================= THANK YOU MESSAGE =================
      doc.roundedRect(40, currentY, 515, 50, 6).fill(COLORS.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
          "THANK YOU FOR CHOOSING BONFIRE LUXURY STAYS",
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
            ? "Start listing your properties and earn commissions on every booking!"
            : "Your subscription is now active. Enjoy premium features and priority support!",
          40,
          currentY + 35,
          { align: "center", width: 515 }
        );

      currentY += 70;

      // ================= THREE COLUMN FOOTER =================
      const footerTop = currentY;

      // Support Card (Left)
      doc
        .roundedRect(40, footerTop, 165, 80, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("SUPPORT", 50, footerTop + 10);

      doc.fillColor(COLORS.textLight).fontSize(7);

      doc.text("Email: support@bonfire.com", 50, footerTop + 30);
      doc.text("Phone: +91 98765 43210", 50, footerTop + 45);
      doc.text("24/7 Partner Support", 50, footerTop + 60);

      // Next Steps Card (Middle)
      doc
        .roundedRect(215, footerTop, 165, 80, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("NEXT STEPS", 225, footerTop + 10);

      doc.fillColor(COLORS.textLight).fontSize(7);

      if (isCommission) {
        doc.text("✓ List your properties", 225, footerTop + 30);
        doc.text("✓ Set competitive prices", 225, footerTop + 45);
        doc.text("✓ Start earning commissions", 225, footerTop + 60);
      } else {
        doc.text("✓ Access partner dashboard", 225, footerTop + 30);
        doc.text("✓ List unlimited properties", 225, footerTop + 45);
        doc.text("✓ Get priority support", 225, footerTop + 60);
      }

      // Terms Card (Right)
      doc
        .roundedRect(390, footerTop, 165, 80, 6)
        .fill(COLORS.lightBg)
        .strokeColor(COLORS.border)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("TERMS", 400, footerTop + 10);

      doc.fillColor(COLORS.textLight).fontSize(7);

      doc.text("• Valid for selected plan period", 400, footerTop + 30);
      doc.text("• Auto-renewal applicable", 400, footerTop + 45);
      doc.text("• Subject to terms & conditions", 400, footerTop + 60);

      // ================= FOOTER BOTTOM =================
      const footerBottom = footerTop + 100;

      doc
        .moveTo(40, footerBottom)
        .lineTo(555, footerBottom)
        .strokeColor(COLORS.primary)
        .stroke();

      doc
        .fontSize(7)
        .fillColor(COLORS.textLight)
        .text(
          "Bonfire Luxury Stays - Computer Generated Partner Invoice",
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
