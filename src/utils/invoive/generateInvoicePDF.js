import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../cloudinary.js";

/**
 * Formats date to DD/MM/YYYY
 */
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

/**
 * Helper to format currency.
 * Using "Rs." instead of "₹" to avoid encoding issues with standard PDF fonts.
 */
const formatCurrency = (amount, sign = "") => {
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}Rs. ${formatted}`;
};

export const generateCustomerInvoicePDF = async (booking, invoiceNumber) => {
  return new Promise((resolve, reject) => {
    // Create a document with standard margins
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

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
        if (!uploaded) {
          return reject(new Error("Invoice upload failed"));
        }

        resolve(uploaded.secure_url);
      } catch (error) {
        reject(error);
      }
    });

    // --- 1. HEADER & LOGO ---
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
    const logoPath = path.join(process.cwd(), "public", "bonfire_logo.jpeg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 80 });
    } else {
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("BONFIRE", 50, 50);
    }

    // Invoice Title and Meta Info (Right Aligned)
    const metaWidth = 200;
    const metaX = 545 - metaWidth;
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("INVOICE", metaX, 50, { width: metaWidth, align: "right" });

    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    doc.text(`Invoice #: ${invoiceNumber}`, metaX, 80, {
      width: metaWidth,
      align: "right",
    });
    doc.text(`Date: ${formatDate(new Date())}`, metaX, 95, {
      width: metaWidth,
      align: "right",
    });
    doc.text(`Booking Ref: ${booking.confirmationCode}`, metaX, 110, {
      width: metaWidth,
      align: "right",
    });
    doc.text(
      `Payment Mode: ${booking.paymentMode.replace("_", " ")}`,
      metaX,
      125,
      {
        width: metaWidth,
        align: "right",
      }
    );

    // Property Address (Top Left)
    doc.moveDown(1);
    const propertyY = 115;
    const propertyWidth = 250;
    doc
      .fontSize(12)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(booking.propertyId?.name || "Bonfire Luxury Stays", 50, propertyY, {
        width: propertyWidth,
      });
    doc.fontSize(9).font("Helvetica").fillColor("#444444");
    doc.text(booking.propertyId.address || "N/A", 50, doc.y + 2, {
      width: propertyWidth,
    });
    doc.text(
      `GSTIN: ${
        booking.propertyId?.documentVerification?.GSTIN?.gstin || "N/A"
      }`,
      50,
      doc.y + 2,
      { width: propertyWidth }
    );

    // Horizontal Line
    doc
      .moveTo(50, 165)
      .lineTo(545, 165)
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();

    // --- 2. GUEST & STAY DETAILS ---
    const detailsY = 185;
    const colWidth = 240;

    // Guest Column
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("BILL TO:", 50, detailsY);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(booking.primaryGuestDetails.fullName, 50, detailsY + 15, {
        width: colWidth,
      });
    doc.fontSize(9).fillColor("#666666");
    doc.text(`Phone: ${booking.primaryGuestDetails.phone}`, 50, doc.y + 2, {
      width: colWidth,
    });
    doc.text(`Email: ${booking.primaryGuestDetails.email}`, 50, doc.y + 2, {
      width: colWidth,
    });

    // Stay Column
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("STAY DETAILS:", 300, detailsY);
    doc.fontSize(9).font("Helvetica").fillColor("#444444");
    doc.text(
      `Check-In:  ${formatDate(booking.checkInDate)}`,
      300,
      detailsY + 15,
      { width: colWidth }
    );
    doc.text(`Check-Out: ${formatDate(booking.checkOutDate)}`, 300, doc.y + 2, {
      width: colWidth,
    });
    doc.text(
      `Occupancy: ${booking.numberOfGuests.adults} Adults, ${
        booking.numberOfGuests.children?.length || 0
      } Children`,
      300,
      doc.y + 2,
      { width: colWidth }
    );

    // --- 3. ROOMS & SERVICES TABLE ---
    const tableTop = 260;
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("ROOMS & SERVICES", 50, tableTop);

    // Table Column Definitions
    const colDescX = 60;
    const colDescW = 190;
    const colQtyX = 260;
    const colQtyW = 30;
    const colPriceX = 300;
    const colPriceW = 85;
    const colDiscX = 395;
    const colDiscW = 75;
    const colTotalX = 480;
    const colTotalW = 65;

    // Table Header
    const headerY = tableTop + 20;
    doc.rect(50, headerY, 495, 22).fill("#f8f8f8");
    doc.fillColor("#333333").fontSize(9).font("Helvetica-Bold");
    doc.text("Description", colDescX, headerY + 7, { width: colDescW });
    doc.text("Qty", colQtyX, headerY + 7, { width: colQtyW, align: "center" });
    doc.text("Price/Night", colPriceX, headerY + 7, {
      width: colPriceW,
      align: "right",
    });
    doc.text("Discount", colDiscX, headerY + 7, {
      width: colDiscW,
      align: "right",
    });
    doc.text("Total", colTotalX, headerY + 7, {
      width: colTotalW,
      align: "right",
    });

    let rowY = headerY + 30;
    doc.font("Helvetica").fontSize(9).fillColor("#444444");

    booking.rooms.forEach((room) => {
      const roomNameHeight = doc.heightOfString(room.roomId.name, {
        width: colDescW,
      });
      const rowHeight = Math.max(roomNameHeight, 18);

      if (rowY + rowHeight > 700) {
        doc.addPage();
        rowY = 50;
      }

      doc
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(room.roomId.name, colDescX, rowY, { width: colDescW });
      doc.font("Helvetica").fillColor("#444444");
      doc.text(room.quantity.toString(), colQtyX, rowY, {
        width: colQtyW,
        align: "center",
      });
      doc.text(formatCurrency(room.pricePerNight), colPriceX, rowY, {
        width: colPriceW,
        align: "right",
      });
      doc.text(formatCurrency(room.discount), colDiscX, rowY, {
        width: colDiscW,
        align: "right",
      });
      console.log("nights", nights);
      console.log(
        (room.pricePerNight - room.discount) * room.quantity * nights
      );
      doc.text(
        formatCurrency(
          (room.pricePerNight - room.discount) * room.quantity * nights
        ),
        colTotalX,
        rowY,
        { width: colTotalW, align: "right" }
      );

      rowY += rowHeight + 5;

      if (room.extraServices && room.extraServices.length > 0) {
        room.extraServices.forEach((service) => {
          const serviceName = `  + ${service.name}`;
          const serviceHeight = doc.heightOfString(serviceName, {
            width: colDescW,
          });

          if (rowY + serviceHeight > 700) {
            doc.addPage();
            rowY = 50;
          }

          doc
            .fontSize(8)
            .fillColor("#888888")
            .text(serviceName, colDescX, rowY, { width: colDescW });
          doc.text(formatCurrency(service.fee), colTotalX, rowY, {
            width: colTotalW,
            align: "right",
          });
          rowY += serviceHeight + 2;
        });
      }

      doc
        .moveTo(50, rowY)
        .lineTo(545, rowY)
        .strokeColor("#f0f0f0")
        .lineWidth(0.5)
        .stroke();
      rowY += 10;
    });

    // --- 4. PRICE BREAKDOWN ---
    if (rowY > 600) {
      doc.addPage();
      rowY = 50;
    }

    rowY += 10;
    const breakdownW = 200;
    const breakdownX = 545 - breakdownW;
    const labelW = 120;
    const valueW = 80;

    const drawBreakdownRow = (label, value, y, sign = "", isBold = false) => {
      doc
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .fillColor(isBold ? "#000000" : "#444444");
      doc.text(label, breakdownX, y, { width: labelW });
      doc.text(formatCurrency(value, sign), breakdownX + labelW, y, {
        width: valueW,
        align: "right",
      });
    };

    drawBreakdownRow(
      "Base Price",
      booking.priceBreakdown.basePrice,
      rowY,
      "+ "
    );
    drawBreakdownRow(
      "Discount",
      booking.priceBreakdown.discountAmount,
      rowY + 18,
      "- "
    );
    drawBreakdownRow(
      "Extra Services",
      booking.priceBreakdown.extraServicesFee,
      rowY + 36,
      "+ "
    );
    const childrenCharge = booking.priceBreakdown?.childrenCharge;
    childrenCharge &&
      drawBreakdownRow(
        "Children Charges",
        booking.priceBreakdown?.childrenCharge,
        rowY + 36,
        "+ "
      );
    drawBreakdownRow(
      "GST ",
      booking.priceBreakdown.gst_amount,
      rowY + 54,
      "+ "
    );

    const totalY = rowY + 80;
    doc.rect(breakdownX, totalY, breakdownW, 30).fill("#000000");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
    doc.text(
      booking.paymentStatus === "paid" ? "TOTAL PAID" : "PAYMENT DUE",
      breakdownX + 10,
      totalY + 9,
      { width: 100 }
    );
    doc.text(formatCurrency(booking.totalPrice), breakdownX + 110, totalY + 9, {
      width: 80,
      align: "right",
    });

    // --- 5. PAYMENT DETAILS ---
    const paymentY = totalY + 60;

    doc
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("PAYMENT INFORMATION", 50, paymentY);

    doc.fontSize(9).font("Helvetica").fillColor("#666666");

    if (booking.paymentStatus === "paid" && booking.paymentMode === "PAY_NOW") {
      doc.text(`Status: PAID`, 50, paymentY + 15);
      doc.text(`Method: ${booking.payment.paymentMethod}`, 50, paymentY + 28);
      doc.text(
        `Transaction ID: ${booking.payment.razorpayPaymentId}`,
        50,
        paymentY + 41
      );
      doc.text(`Currency: ${booking.payment.currency}`, 50, paymentY + 54);
    } else if (booking.paymentMode === "PAY_ON_ARRIVAL" ) {
      doc.text(`Status: PAYMENT DUE`, 50, paymentY + 15);
      doc.text(
        `Please complete the payment during check-in at the property.`,
        50,
        paymentY + 41,
        { width: 400 }
      );
    }

    // --- 6. FOOTER ---
    const footerY = 760;
    doc
      .moveTo(50, footerY - 10)
      .lineTo(545, footerY - 10)
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        "This is a computer-generated document. No signature is required.",
        50,
        footerY,
        { align: "center" }
      );
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("THANK YOU FOR CHOOSING BONFIRE LUXURY STAYS", 50, footerY + 15, {
        align: "center",
      });

    doc.end();
  });
};
