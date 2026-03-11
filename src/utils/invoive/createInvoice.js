import Invoice from "../../models/Listing/invoice.model.js";
import { generateInvoiceNumber } from "./generateInvoiceNumber.js";
import Booking from "../../models/Listing/booking.model.js";
import { generateCustomerInvoicePDF } from "./generateInvoicePDF.js";

        // const booking = {
        //   confirmationCode: "BNF-987654",
        //   propertyId: { name: "Bonfire Luxury Villa" },
        //   primaryGuestDetails: {
        //     fullName: "John Doe",
        //     phone: "+91 98765 43210",
        //     email: "john.doe@example.com",
        //   },
        //   checkInDate: "2026-04-10",
        //   checkOutDate: "2026-04-15",
        //   numberOfGuests: { adults: 2, children: [] },
        //   rooms: [
        //     {
        //       roomId: { name: "Ocean View Suite" },
        //       quantity: 1,
        //       pricePerNight: 15000,
        //       discount: 2000,
        //       extraServices: [
        //         { name: "Airport Transfer", fee: 1500 },
        //         { name: "Breakfast Buffet", fee: 1000 },
        //       ],
        //     },
        //     {
        //       roomId: { name: "Ocean View " },
        //       quantity: 1,
        //       pricePerNight: 25000,
        //       discount: 2000,
        //       extraServices: [
        //         { name: "Airport Transfer", fee: 1500 },
        //         { name: "Breakfast Buffet", fee: 1000 },
        //       ],
        //     },
        //   ],
        //   priceBreakdown: {
        //     basePrice: 75000,
        //     discountAmount: 10000,
        //     extraServicesFee: 2500,
        //     gst_amount: 11700,
        //   },
        //   totalPrice: 79200,
        //   payment: {
        //     paymentMethod: "Credit Card",
        //     razorpayPaymentId: "pay_P123456789",
        //     currency: "INR",
        //   },
        // };    

export const createCustomerInvoice = async (bookingId) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();

    const booking = await Booking.findById(bookingId)
      .populate("propertyId", "name documentVerification")
      .populate("rooms.roomId", "name");

    if (!booking) {
      throw new Error("Booking not found");
    }

    const url = await generateCustomerInvoicePDF(booking, invoiceNumber);
    console.log(url);
    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: "CUSTOMER_INVOICE",
      pdfUrl: url,
    });
     console.log(invoice);
    booking.invoiceId = invoice._id;
    await booking.save();

    return invoice;
  } catch (error) {
    console.error("Invoice generation failed:", error);
    throw error;
  }
};
const id ='69b10b47429d8dfa3332865b';
//createCustomerInvoice(id);