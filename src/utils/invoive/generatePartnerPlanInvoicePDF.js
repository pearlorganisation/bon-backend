
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../cloudinary.js";
import crypto from "crypto";

// 🎨 UI COLORS
const COLORS = {
  primary: "#f97316",
  primaryDark: "#ea580c",
  primaryLight: "#fff7ed",
  secondary: "#1f2937",
  secondaryLight: "#374151",
  grayBg: "#f9fafb",
  grayBorder: "#e5e7eb",
  textDark: "#111827",
  textMedium: "#4b5563",
  textLight: "#6b7280",
  success: "#10b981",
  successBg: "#d1fae5",
  danger: "#ef4444",
  dangerBg: "#fee2e2",
  white: "#ffffff",
  tableHeader: "#f97316",
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

const generateInvoiceNumber = async () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PINV-${timestamp}-${random}`;
};

const getImageBuffer = async (url) => {
  try {
    if (!url) return null;
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });
    return Buffer.from(response.data);
  } catch (e) {
    console.error("Failed to load image:", url);
    return null;
  }
};

export const generatePartnerPlanInvoicePDF = async (
  plan,
  commissionData,
  invoiceNumber
) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true,
      info: {
        Title: `Partner Plan Invoice ${invoiceNumber}`,
        Author: "Bonfire Luxury Stays",
        Subject: "Partner Plan Invoice",
      },
    });
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
        const [uploaded] = await uploadFileToCloudinary(file, "/PartnerInvoices");
        resolve(uploaded ? uploaded.secure_url : null);
      } catch (error) {
        reject(error);
      }
    });

    try {
      const isPaid = plan.PlanType === "COMMISSION" 
        ? true 
        : (plan.subscriptionPayment?.paymentId ? true : false);
      
      const partner = plan.partnerId;
      const subscriptionPlan = plan.subscriptionPlanId 

      // Calculate amount based on plan type
      let planAmount = 0;
      let planDescription = "";
      let planDuration = "";

      if (plan.PlanType === "COMMISSION") {
        const commissionRange = commissionData?.commission || { min: 10, max: 50 };
        planAmount = 0;
        planDescription = `Commission Based Plan (${commissionRange.min}% - ${commissionRange.max}%)`;
        planDuration = "Ongoing";
      } else if (plan.PlanType === "SUBSCRIPTION" && subscriptionPlan) {
        planAmount = subscriptionPlan.price || 0;
        planDescription = subscriptionPlan.name || "Subscription Plan";
        planDuration = `${subscriptionPlan.durationDays || 30} Days`;
      }

      // ================= HEADER =================
      doc.rect(0, 0, 595, 110).fill(COLORS.primary);

      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 20, { width: 70 });
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("PARTNER INVOICE", 400, 30, { align: "right" });

      const statusColor = isPaid ? COLORS.success : COLORS.danger;
      doc.roundedRect(455, 60, 95, 20, 4).fill(statusColor);

      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(isPaid ? "PAID" : "PAYMENT DUE", 455, 65, {
          width: 95,
          align: "center",
        });

      doc.fillColor(COLORS.white).font("Helvetica").fontSize(8);
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
      doc.moveTo(40, 125).lineTo(555, 125).strokeColor(COLORS.grayBorder).stroke();

      // ================= PARTNER & PLAN CARDS =================
      let currentY = 140;

      // Partner Card
      const partnerCardX = 40;
      const partnerCardY = currentY;
      const partnerCardWidth = 250;

      doc
        .roundedRect(partnerCardX, partnerCardY, partnerCardWidth, 95, 6)
        .fill(COLORS.grayBg)
        .strokeColor(COLORS.grayBorder)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("PARTNER DETAILS", partnerCardX + 10, partnerCardY + 10);

      doc.fillColor(COLORS.textMedium).font("Helvetica").fontSize(8);

      let partnerY = partnerCardY + 28;
      doc.text(`Name: ${partner?.name || "N/A"}`, partnerCardX + 10, partnerY);
      partnerY += 14;
      doc.text(`Email: ${partner?.email || "N/A"}`, partnerCardX + 10, partnerY);
      partnerY += 14;
      doc.text(`Phone: ${partner?.phoneNumber || "N/A"}`, partnerCardX + 10, partnerY);
      partnerY += 14;
      doc.text(`Partner ID: ${plan.partnerId || "N/A"}`, partnerCardX + 10, partnerY);

      // Plan Card
      const planCardX = 305;
      const planCardY = currentY;
      const planCardWidth = 250;

      doc
        .roundedRect(planCardX, planCardY, planCardWidth, 95, 6)
        .fill(COLORS.grayBg)
        .strokeColor(COLORS.grayBorder)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("PLAN DETAILS", planCardX + 10, planCardY + 10);

      doc.fillColor(COLORS.textMedium).font("Helvetica").fontSize(8);

      let planY = planCardY + 28;
      doc.text(`Plan Type: ${plan.PlanType || "N/A"}`, planCardX + 10, planY);
      planY += 14;
      doc.text(`Description: ${planDescription}`, planCardX + 10, planY);
      planY += 14;
      doc.text(`Duration: ${planDuration}`, planCardX + 10, planY);
      planY += 14;
      doc.text(`Status: ${plan.planStatus || "N/A"}`, planCardX + 10, planY);

      currentY += 110;

      // ================= SUMMARY CARD =================
      const summaryY = currentY;
      doc.roundedRect(40, summaryY, 515, 45, 6).fill(COLORS.grayBg);

      doc.fillColor(COLORS.primaryDark).fontSize(8).font("Helvetica-Bold");

      doc.text("PLAN START", 60, summaryY + 12);
      doc.text("PLAN END", 180, summaryY + 12);
      doc.text("PLAN STATUS", 300, summaryY + 12);
      doc.text("PAYMENT STATUS", 420, summaryY + 12);

      doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);

      doc.text(formatDate(plan.startDate), 60, summaryY + 28);
      doc.text(formatDate(plan.endDate), 180, summaryY + 28);
      doc.text(plan.planStatus, 300, summaryY + 28);
      doc.text(isPaid ? "PAID" : "PENDING", 420, summaryY + 28);

      currentY += 60;

      // ================= BILLING DETAILS TABLE =================
      const tableTop = currentY;

      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("BILLING DETAILS", 40, tableTop);

      const headers = {
        desc: 40,
        amount: 250,
        tax: 350,
        total: 470,
      };

      doc.rect(40, tableTop + 15, 515, 20).fill(COLORS.tableHeader);
      doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");

      doc.text("DESCRIPTION", headers.desc + 10, tableTop + 21);
      doc.text("AMOUNT", headers.amount, tableTop + 21, {
        width: 80,
        align: "right",
      });
      doc.text("GST (18%)", headers.tax, tableTop + 21, {
        width: 80,
        align: "right",
      });
      doc.text("TOTAL", headers.total, tableTop + 21, {
        width: 80,
        align: "right",
      });

      let rowY = tableTop + 45;
      const gstRate = 0.18;
      const gstAmount = planAmount * gstRate;
      const totalWithGST = planAmount + gstAmount;

      // Plan row
      doc
        .fillColor(COLORS.textDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(planDescription, headers.desc + 10, rowY, {
          width: 200,
        });

      doc
        .font("Helvetica")
        .text(formatCurrency(planAmount), headers.amount, rowY, {
          width: 80,
          align: "right",
        });

      doc.text(formatCurrency(gstAmount), headers.tax, rowY, {
        width: 80,
        align: "right",
      });

      doc.text(formatCurrency(totalWithGST), headers.total, rowY, {
        width: 80,
        align: "right",
      });

      rowY += 25;

      doc
        .moveTo(40, rowY)
        .lineTo(555, rowY)
        .strokeColor(COLORS.grayBorder)
        .stroke();

      rowY += 15;

      // ================= CALCULATIONS =================
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

      drawCalcRow("Plan Amount", planAmount, rowY);
      drawCalcRow("GST (18%)", gstAmount, rowY + 15);
      drawCalcRow("Total Amount", totalWithGST, rowY + 30, true);

      rowY += 75;

      doc.roundedRect(calcX, rowY - 10, 210, 28, 6).fill(COLORS.primary);

      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("GRAND TOTAL", calcX + 10, rowY - 3);

      doc.text(formatCurrency(totalWithGST), calcX + 70, rowY - 3, {
        align: "right",
      });

      rowY += 40;

      // ================= THREE COLUMN FOOTER =================
      const footerTop = Math.max(rowY, 680);

      // Payment Info Card (Left)
      const paymentX = 40;
      const paymentWidth = 165;
      doc
        .roundedRect(paymentX, footerTop, paymentWidth, 95, 6)
        .fill(COLORS.grayBg)
        .strokeColor(COLORS.grayBorder)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("PAYMENT INFO", paymentX + 8, footerTop + 8);

      doc.fillColor(COLORS.textLight).font("Helvetica").fontSize(7);

      let paymentY = footerTop + 25;
      
      if (plan.PlanType === "COMMISSION") {
        doc.text(`Plan Type: Commission Based`, paymentX + 8, paymentY);
        paymentY += 14;
        doc.text(`Commission: ${commissionData?.commission?.min}% - ${commissionData?.commission?.max}%`, paymentX + 8, paymentY);
        paymentY += 14;
        doc.text(`Status: Active`, paymentX + 8, paymentY);
        paymentY += 14;
        doc.text(`No upfront payment required`, paymentX + 8, paymentY);
      } else if (plan.PlanType === "SUBSCRIPTION") {
        doc.text(`Method: Online Payment`, paymentX + 8, paymentY);
        paymentY += 14;
        
        if (plan.subscriptionPayment?.paymentId) {
          doc.text(`Payment ID: ${plan.subscriptionPayment.paymentId}`, paymentX + 8, paymentY);
          paymentY += 14;
          doc.text(`Order ID: ${plan.subscriptionPayment.orderId || "N/A"}`, paymentX + 8, paymentY);
          paymentY += 14;
          doc.text(`Amount: ${formatCurrency(totalWithGST)}`, paymentX + 8, paymentY);
          paymentY += 14;
          doc.text(`Status: PAID`, paymentX + 8, paymentY);
        } else {
          doc.text(`Status: PENDING`, paymentX + 8, paymentY);
          paymentY += 14;
          doc.text(`Amount Due: ${formatCurrency(totalWithGST)}`, paymentX + 8, paymentY);
          paymentY += 14;
          doc.text(`Please complete payment`, paymentX + 8, paymentY);
        }
      }

      // Plan Benefits Card (Middle)
      const benefitsX = 215;
      const benefitsWidth = 165;
      const benefitsHeight = 95;

      doc
        .roundedRect(benefitsX, footerTop, benefitsWidth, benefitsHeight, 6)
        .fill(COLORS.grayBg)
        .strokeColor(COLORS.grayBorder)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("PLAN BENEFITS", benefitsX + 8, footerTop + 8);

      doc.fillColor(COLORS.textLight).fontSize(7);

      let benefitsY = footerTop + 25;
      
      if (plan.PlanType === "COMMISSION") {
        doc.text(`• Revenue sharing model`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• No fixed monthly cost`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Pay only when you earn`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Transparent calculations`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Monthly commission reports`, benefitsX + 8, benefitsY);
      } else {
        doc.text(`• Full platform access`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Priority support 24/7`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Marketing features`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Analytics dashboard`, benefitsX + 8, benefitsY);
        benefitsY += 12;
        doc.text(`• Unlimited listings`, benefitsX + 8, benefitsY);
      }

      // Terms & Conditions Card (Right)
      const termsX = 390;
      const termsWidth = 165;
      doc
        .roundedRect(termsX, footerTop, termsWidth, 95, 6)
        .fill(COLORS.grayBg)
        .strokeColor(COLORS.grayBorder)
        .stroke();

      doc
        .fillColor(COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("TERMS & CONDITIONS", termsX + 8, footerTop + 8);

      doc.fillColor(COLORS.textLight).fontSize(7);

      let termsY = footerTop + 25;
      doc.text(`• Valid for ${planDuration}`, termsX + 8, termsY);
      termsY += 12;
      doc.text(`• Auto-renewal applicable`, termsX + 8, termsY);
      termsY += 12;
      doc.text(`• 7-day cancellation policy`, termsX + 8, termsY);
      termsY += 12;
      doc.text(`• Support: 24/7 available`, termsX + 8, termsY);
      termsY += 12;
      doc.text(`• GST as per government rules`, termsX + 8, termsY);

      // Bottom Footer Line
      const footerBottom = Math.max(footerTop + benefitsHeight, footerTop + 95) + 15;

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

      doc
        .fontSize(6)
        .fillColor(COLORS.textLight)
        .text(
          "This is a system generated invoice and does not require physical signature.",
          40,
          footerBottom + 20,
          {
            align: "center",
            width: 515,
          }
        );

      doc.end();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      reject(err);
    }
  });
};