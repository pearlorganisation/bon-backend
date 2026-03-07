import Invoice from "../../models/Listing/invoice.model.js";
import { generateInvoiceNumber } from "./generateInvoiceNumber.js";
import Booking from "../../models/Listing/booking.model.js";
import { generateCustomerInvoicePDF } from "./generateInvoicePDF.js";

export const createCustomerInvoice = async (bookingId) => {
  const invoiceNumber = await generateInvoiceNumber();

  const booking = await Booking.findById(bookingId)
    .populate("propertyId", "name")
    .populate("rooms.roomId", "name");

  const url = generateCustomerInvoicePDF(booking, invoiceNumber);

  const invoice = await Invoice.create({
    invoiceNumber,
    invoiceType: "CUSTOMER_INVOICE",
    pdfUrl: url,
  });

  // store invoice id in booking
  await Booking.findByIdAndUpdate(bookingId, { invoiceId: invoice._id });

  return invoice;
};
