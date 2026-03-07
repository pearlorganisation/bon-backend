import Invoice from "../../models/Listing/invoice.model.js";


export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();

  const lastInvoice = await Invoice.findOne({
    invoiceNumber: { $regex: `INV-${year}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastInvoice) {
    const last = lastInvoice.invoiceNumber.split("-")[2];
    nextNumber = parseInt(last) + 1;
  }

  return `INV-${year}-${String(nextNumber).padStart(6, "0")}`;
};
