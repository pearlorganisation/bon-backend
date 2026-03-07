import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Formats date to DD/MM/YYYY
 */
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

export const generateCustomerInvoicePDF = (booking, invoiceNumber) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const filePath = `invoices/${invoiceNumber}.pdf`;
  doc.pipe(fs.createWriteStream(filePath));

  // --- 1. HEADER & LOGO ---
  // Updated to use bonfire_logo.jpeg
  const logoPath = path.join(process.cwd(), "public", "bonfire_logo.jpeg");

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, { width: 80 }); // Adjusted width for better visibility
  } else {
    // Fallback text if logo is missing
    doc.fontSize(20).font("Helvetica-Bold").text("BONFRE", 50, 50);
  }

  doc
    .fontSize(25)
    .font("Helvetica-Bold")
    .text("INVOICE", 0, 50, { align: "right" });

  doc.fontSize(10).font("Helvetica").fillColor("#444444");
  doc.text(`Invoice Number: ${invoiceNumber}`, 0, 85, { align: "right" });
  doc.text(`Date: ${formatDate(new Date())}`, 0, 100, { align: "right" });
  doc.text(`Booking Code: ${booking.confirmationCode}`, 0, 115, {
    align: "right",
  });

  // Property Address (Top Left)
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(booking.propertyId.name, 50, 115);
  doc.font("Helvetica").text("123, Luxury Lane, Goa, India", 50, 130);
  doc.text("GSTIN: 30AAAAA0000A1Z5", 50, 145);

  doc.moveDown(3);
  const lineTop = doc.y;
  doc.moveTo(50, lineTop).lineTo(545, lineTop).stroke();

  // --- 2. GUEST & STAY DETAILS ---
  doc.moveDown(2);
  const detailsY = doc.y;

  doc.fontSize(11).font("Helvetica-Bold").text("GUEST DETAILS", 50, detailsY);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Name: ${booking.primaryGuestDetails.fullName}`, 50, detailsY + 20);
  doc.text(`Phone: ${booking.primaryGuestDetails.phone}`, 50, detailsY + 35);
  doc.text(`Email: ${booking.primaryGuestDetails.email}`, 50, detailsY + 50);

  doc.fontSize(11).font("Helvetica-Bold").text("STAY DETAILS", 300, detailsY);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Check-In: ${formatDate(booking.checkInDate)}`, 300, detailsY + 20);
  doc.text(
    `Check-Out: ${formatDate(booking.checkOutDate)}`,
    300,
    detailsY + 35
  );
  doc.text(
    `Guests: ${booking.numberOfGuests.adults} Adults, ${booking.numberOfGuests.children.length} Children`,
    300,
    detailsY + 50
  );

  doc.moveDown(5);

  // --- 3. ROOMS & SERVICES TABLE ---
  doc.fontSize(12).font("Helvetica-Bold").text("ROOMS & SERVICES", 50);
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.rect(50, tableTop, 495, 20).fill("#f0f0f0");
  doc.fillColor("#000000").fontSize(10).font("Helvetica-Bold");
  doc.text("Description", 60, tableTop + 5);
  doc.text("Qty", 300, tableTop + 5);
  doc.text("Price/Night", 380, tableTop + 5);
  doc.text("Discount", 480, tableTop + 5); // Changed header to Discount

  let rowY = tableTop + 25;
  doc.font("Helvetica").fontSize(10);

  booking.rooms.forEach((room) => {
    doc.text(room.roomId.name, 60, rowY);
    doc.text(room.quantity.toString(), 300, rowY);
    doc.text(`₹${room.pricePerNight.toLocaleString()}`, 380, rowY);
    // Changed to show room discount
    doc.text(`₹${room.discount.toLocaleString()}`, 480, rowY, {
      width: 60,
      align: "right",
    });

    rowY += 20;

    if (room.extraServices.length > 0) {
      room.extraServices.forEach((service) => {
        doc
          .fontSize(9)
          .fillColor("#666666")
          .text(`- ${service.name}`, 70, rowY);
        doc.text(`₹${service.fee.toLocaleString()}`, 480, rowY, {
          width: 60,
          align: "right",
        });
        rowY += 15;
      });
    }
    rowY += 10;
  });

  // --- 4. PRICE BREAKDOWN ---
  doc.moveTo(350, rowY).lineTo(545, rowY).stroke();
  rowY += 15;

  const drawRow = (label, value, y, isBold = false) => {
    doc
      .font(isBold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10)
      .fillColor("#000000");
    doc.text(label, 350, y);
    doc.text(`₹${value.toLocaleString()}`, 480, y, { align: "right" });
  };

  drawRow("Base Price:", booking.priceBreakdown.basePrice, rowY);
  drawRow("Discount:", booking.priceBreakdown.discountAmount, rowY + 15);
  drawRow(
    "Extra Services:",
    booking.priceBreakdown.extraServicesFee,
    rowY + 30
  );
  drawRow("GST:", booking.priceBreakdown.gst_amount, rowY + 45);

  doc.moveDown(1);
  doc.rect(350, rowY + 65, 195, 25).fill("#000000");
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("TOTAL PAID", 360, rowY + 72);
  doc.text(`₹${booking.totalPrice.toLocaleString()}`, 450, rowY + 72, {
    width: 85,
    align: "right",
  });

  // --- 5. PAYMENT DETAILS ---
  doc.moveDown(6);
  doc
    .fillColor("#000000")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("PAYMENT DETAILS", 50);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Method: ${booking.payment.paymentMethod}`, 50);
  doc.text(`Razorpay ID: ${booking.payment.razorpayPaymentId}`, 50);
  doc.text(`Currency: ${booking.payment.currency}`, 50);

  // --- 6. FOOTER ---
  doc
    .fontSize(8)
    .fillColor("#999999")
    .text(
      "This is a computer-generated document. No signature is required.",
      50,
      750,
      { align: "center" }
    );
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text("THANK YOU FOR CHOOSING BONFRE LUXURY STAYS", 50, 765, {
      align: "center",
    });

  doc.end();
  return filePath;
};
