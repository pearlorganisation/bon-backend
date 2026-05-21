import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../cloudinary.js";
import { getPlatformSettings } from "../invoive/createInvoice.js";
import Property from "../../models/Listing/property.model.js";
import Partner from "../../models/Partner/partner.model.js";
import Auth from "../../models/auth/auth.model.js";
import propertyAgreementDoc from "../../models/Listing/propertyAgreementDocmodel.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Format date as DD/MM/YYYY
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};
 
// ─────────────────────────────────────────────────────────────────────────────
// verifyPropertyAndPartner
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPropertyAndPartner = async (propertyId) => {
  const property = await Property.findById(propertyId);
  if (!property) throw new Error("Property not found.");
  if (property.verified !== "approved")
    throw new Error(`Property is not approved. Current status: ${property.verified}`);
  if (!property.partnerId)
    throw new Error("Property does not have an associated partner.");
 
  const auth = await Auth.findById(property.partnerId);
  if (!auth) throw new Error("Partner Auth record not found.");
  if (auth.role !== "PARTNER")
    throw new Error(`Auth user is not a PARTNER. Actual role: ${auth.role}`);
 
  const partner = await Partner.findOne({ userId: property.partnerId });
  if (!partner) throw new Error("Partner profile not found.");
  if (!partner.isVerified)
    throw new Error("Partner is not verified (PAN/fund account incomplete).");


 
  return { property, auth, partner };
};
 
// ─────────────────────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  orange:   "#f97316",
  offWhite: "#ffe8d6",
  white:    "#ffffff",
  dark:     "#1f2937",
  mid:      "#374151",
  light:    "#6b7280",
  border:   "#d1d5db",
  faint:    "#f9fafb",
};
 
// ─────────────────────────────────────────────────────────────────────────────
// generatePropertyAgreementPDF
// ─────────────────────────────────────────────────────────────────────────────
export const generatePropertyAgreementPDF = async (
  { property, auth, partner },
  agreementNumber
) => {
  return new Promise(async (resolve, reject) => {
    const PAGE_W   = 595.28;
    const PAGE_H   = 841.89;
    const MARGIN   = 51;
    const CW       = PAGE_W - MARGIN * 2;
    const HEADER_H = 136;   // ~48mm, first page only
 
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      autoFirstPage: true,
    });
 
    const buffers = [];
    doc.on("data", (d) => buffers.push(d));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const file = {
          buffer: pdfBuffer,
          mimetype: "application/pdf",
          originalname: `${agreementNumber}.pdf`,
        };
        const [uploaded] = await uploadFileToCloudinary(file, "/PropertyAgreements");
        resolve(uploaded ? uploaded.secure_url : null);
      } catch (err) {
        reject(err);
      }
    });
 
    try {
      const platformSettings = await getPlatformSettings();
      const supportEmail = platformSettings?.supportEmail || "support@bonfireescapes.com";
      const supportPhone = platformSettings?.supportPhone || "N/A";
      const today        = formatDate(new Date());
 
      const propName    = property.name          || "N/A";
      const propAddress = property.address       || "N/A";
      const propCity    = property.city          || "N/A";
      const propState   = property.state         || "N/A";
      const ownerName   = auth.name              || "N/A";
      const ownerEmail  = auth.email             || "N/A";
      const ownerPhone  = auth.phoneNumber       || "N/A";
      const panNumber   = partner.panDetails?.panNumber || "N/A";
      const gstin       = property?.documentVerification?.GSTIN?.gstin  || "N/A";
 
      // ── Y tracker ─────────────────────────────────────────────────────────
      let y = MARGIN;
 
      const gap = (pts) => { y += pts; };
 
      // Add new page if remaining space < needed
      const need = (needed) => {
        if (y + needed > PAGE_H - MARGIN) {
          doc.addPage();
          y = MARGIN;
        }
      };
 
      // ── HEADER (page 1 only) ───────────────────────────────────────────────
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.orange);
 
      const LOGO_W = 80;
      const LOGO_H = 36;
      const logoY  = (HEADER_H - LOGO_H) / 2;   // vertically centred
 
      const logoPath = path.join(process.cwd(), "public", "bonfire_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, logoY, { fit: [LOGO_W, LOGO_H] });
      } else {
        doc.roundedRect(MARGIN, logoY, LOGO_W, LOGO_H, 4).fill(C.white);
        doc.fillColor(C.orange).fontSize(18).font("Helvetica-Bold")
           .text("BE", MARGIN + 26, logoY + 9);
      }
 
      // Website URL — bottom of band, below logo
      doc.fillColor(C.offWhite).fontSize(8).font("Helvetica")
         .text("www.bonfireescapes.com", MARGIN, HEADER_H - 18);
 
      // Property name + document label — right side, horizontally aligned with logo
      const midBand = HEADER_H / 2;
      doc.fillColor(C.white).fontSize(13).font("Helvetica-Bold")
         .text(propName.toUpperCase(), MARGIN + LOGO_W + 16, midBand - 12, {
           width: CW - LOGO_W - 16,
           align: "right",
         });
      doc.fillColor(C.offWhite).fontSize(9).font("Helvetica")
         .text("HOTEL PARTNER AGREEMENT", MARGIN + LOGO_W + 16, midBand + 6, {
           width: CW - LOGO_W - 16,
           align: "right",
         });
 
      y = HEADER_H + 18;
 
      // ── TITLE ─────────────────────────────────────────────────────────────
      doc.fillColor(C.dark).fontSize(13).font("Helvetica-Bold")
         .text("BONFIRE ESCAPES – HOTEL PARTNER AGREEMENT", MARGIN, y, {
           width: CW, align: "center",
         });
      gap(doc.y - y + 4);
 
      doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
         .strokeColor(C.border).lineWidth(0.5).stroke();
      gap(7);
 
      doc.fillColor(C.mid).fontSize(9.5).font("Helvetica")
         .text('This Hotel Partner Agreement ("Agreement") is made on:', MARGIN, y, { width: CW });
      gap(doc.y - y + 5);
 
      doc.font("Helvetica-Bold").fillColor(C.dark).fontSize(9.5).text("Date:", MARGIN, y);
      doc.font("Helvetica").fillColor(C.mid).text(today, MARGIN + 48, y);
      gap(18);
 
      doc.font("Helvetica-Bold").fillColor(C.dark).fontSize(9.5).text("Between:", MARGIN, y);
      gap(16);
 
      // ── SECTION HELPERS ───────────────────────────────────────────────────
 
      const sectionHead = (title) => {
        need(34);
        gap(6);
        doc.fillColor(C.dark).fontSize(10.5).font("Helvetica-Bold")
           .text(title, MARGIN, y, { width: CW });
        gap(doc.y - y + 4);
        doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
           .strokeColor(C.border).lineWidth(0.5).stroke();
        gap(5);
      };
 
      const fieldRow = (label, value) => {
        const LW = 148;
        need(16);
        // draw label
        doc.font("Helvetica-Bold").fillColor(C.dark).fontSize(9.5)
           .text(label, MARGIN, y, { width: LW, lineBreak: false });
        // draw value starting at same Y
        doc.font("Helvetica").fillColor(C.mid).fontSize(9.5)
           .text(value, MARGIN + LW, y, { width: CW - LW });
        // advance past whichever was taller
        gap(doc.y - y + 4);
      };
 
      const para = (text) => {
        need(Math.ceil(text.length / 88) * 14 + 6);
        doc.font("Helvetica").fillColor(C.mid).fontSize(9.5)
           .text(text, MARGIN, y, { width: CW, align: "justify" });
        gap(doc.y - y + 5);
      };
 
      const bul = (text) => {
        need(Math.ceil(text.length / 82) * 14 + 4);
        doc.font("Helvetica").fillColor(C.mid).fontSize(9.5)
           .text(`• ${text}`, MARGIN + 10, y, { width: CW - 10, align: "justify" });
        gap(doc.y - y + 4);
      };
 
      // ── SECTION 1 ─────────────────────────────────────────────────────────
      sectionHead("1.  Company Details");
      fieldRow("Company Name:", "Bonfire Escapes");
      fieldRow("Website:", "www.bonfireescapes.com");
      fieldRow("Email:", supportEmail);
      fieldRow("Phone:", supportPhone);
 
      gap(6);
      doc.font("Helvetica-Bold").fillColor(C.dark).fontSize(9.5).text("AND", MARGIN, y);
      gap(14);
 
      // ── SECTION 2 ─────────────────────────────────────────────────────────
      sectionHead("2.  Property Owner / Hotel Details");
      fieldRow("Property Name:", propName);
      fieldRow("Owner / Authorized Person:", ownerName);
      fieldRow("Address:", propAddress);
      fieldRow("City / State:", `${propCity}, ${propState}`);
      fieldRow("Phone:", ownerPhone);
      fieldRow("Email:", ownerEmail);
      fieldRow("GST Number:", gstin);
      fieldRow("PAN Number:", panNumber);
 
      // ── SECTION 3 ─────────────────────────────────────────────────────────
      sectionHead("3.  Purpose of Agreement");
      para("Bonfire Escapes will list and promote the property on its OTA platform for online bookings, promotions, and customer management.");
 
      // ── SECTION 4 ─────────────────────────────────────────────────────────
      sectionHead("4.  Services Provided by Bonfire Escapes");
      para("Bonfire Escapes agrees to:");
      bul("Display the property on the website and associated platforms.");
      bul("Generate customer bookings through online marketing.");
      bul("Provide a property dashboard/panel for inventory and pricing management.");
      bul("Share booking details with the property owner.");
      bul("Process online payments where applicable.");
 
      // ── SECTION 5 ─────────────────────────────────────────────────────────
      sectionHead("5.  Property Owner Responsibilities");
      para("The Property Owner agrees to:");
      bul("Provide accurate property details, photos, amenities, pricing, and policies.");
      bul("Maintain cleanliness, safety, and quality standards.");
      bul("Honor confirmed bookings received through Bonfire Escapes.");
      bul("Keep room inventory and rates updated.");
      bul("Ensure valid licenses, GST, and legal compliance.");
 
      // ── SECTION 6 ─────────────────────────────────────────────────────────
      sectionHead("6.  Commission & Payments");
      bul("Bonfire Escapes will charge a commission amount as per the confirmed booking.");
      bul("Payment settlement will be processed within 4–5 working days after guest checkout.");
      bul("Any applicable taxes will be deducted as per government regulations.");
 
      // ── SECTION 7 ─────────────────────────────────────────────────────────
      sectionHead("7.  Cancellation & Refund Policy");
      bul("Cancellation and refund rules will follow the policy selected by the property owner.");
      bul("Refund timelines may vary depending on payment gateway and banking processes.");
 
      // ── SECTION 8 ─────────────────────────────────────────────────────────
      sectionHead("8.  Term & Termination");
      bul("This Agreement shall remain valid until terminated by either party.");
      bul("Either party may terminate this Agreement with 30 days' written notice.");
      bul("Bonfire Escapes reserves the right to suspend or remove listings in case of fraud, guest complaints, policy violations, or misleading information.");
 
      // ── SECTION 9 ─────────────────────────────────────────────────────────
      sectionHead("9.  Liability");
      bul("Bonfire Escapes acts only as an online booking platform.");
      bul("The property owner is solely responsible for guest services, staff behaviour, safety, and property operations.");
      bul("Bonfire Escapes will not be liable for disputes, damages, accidents, or losses occurring at the property.");
 
      // ── SECTION 10 ────────────────────────────────────────────────────────
      sectionHead("10.  Intellectual Property");
      para("The Property Owner grants Bonfire Escapes permission to use property images, logos, and content for promotional and marketing purposes.");
 
      // ── SECTION 11 ────────────────────────────────────────────────────────
      sectionHead("11.  Confidentiality");
      para("Both parties agree to keep confidential business information and customer data secure and not misuse it.");
 
      // ── SECTION 12 ────────────────────────────────────────────────────────
      sectionHead("12.  Governing Law");
      para("This Agreement shall be governed under the laws of India.");
 
      // ── SECTION 13: ACCEPTANCE / SIGNATURES ───────────────────────────────
      need(180);
      sectionHead("13.  Acceptance");
      para("By signing below, both parties agree to the terms and conditions mentioned in this Agreement.");
 
      gap(10);
 
      const SIG_W = (CW - 20) / 2;
      const COL_R = MARGIN + SIG_W + 20;
 
      // Header row with faint bg
      doc.rect(MARGIN, y, CW, 24).fill(C.faint);
      doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(9.5);
      doc.text("For Bonfire Escapes",        MARGIN + 4, y + 7);
      doc.text("For Property Owner / Hotel", COL_R + 4,  y + 7);
      gap(28);
 
      // Role labels
      doc.font("Helvetica").fillColor(C.light).fontSize(8.5);
      doc.text("Authorized Signatory", MARGIN, y);
      doc.text("Authorized Signatory", COL_R,  y);
      gap(14);
 
      // Names
      doc.font("Helvetica-Bold").fillColor(C.dark).fontSize(10);
      doc.text("Akshit Mittal", MARGIN, y);
      doc.text(ownerName,       COL_R,  y);
      gap(26);
 
      // Signature lines
      doc.moveTo(MARGIN, y).lineTo(MARGIN + SIG_W - 10, y)
         .strokeColor(C.light).lineWidth(0.6).stroke();
      doc.moveTo(COL_R,  y).lineTo(COL_R  + SIG_W - 10, y)
         .strokeColor(C.light).lineWidth(0.6).stroke();
      gap(5);
 
      doc.font("Helvetica").fillColor(C.light).fontSize(8.5);
      doc.text("Signature", MARGIN, y);
      doc.text("Signature", COL_R,  y);
      gap(18);
 
      // Date
      doc.font("Helvetica").fillColor(C.mid).fontSize(9);
      doc.text(`Date:  ${today}`, MARGIN, y);
      doc.text(`Date:  ${today}`, COL_R,  y);
      gap(20);
 
      // Disclaimer
      doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
         .strokeColor(C.border).lineWidth(0.5).stroke();
      gap(6);
      doc.font("Helvetica").fillColor(C.light).fontSize(7.5)
         .text(
           "This is a computer-generated document and does not require a physical signature for digital agreements.",
           MARGIN, y, { width: CW, align: "center" }
         );
 
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
 
// ─────────────────────────────────────────────────────────────────────────────
// createPropertyAgreement
// ─────────────────────────────────────────────────────────────────────────────
export const createPropertyAgreement = async (propertyId) => {
  try {
    const { property, auth, partner } = await verifyPropertyAndPartner(
      propertyId
    );

    // Find agreement doc
    let agreementDoc = await propertyAgreementDoc.findOne({
      partnerId: auth._id,
      propertyId,
    });

    // Create if not exists
    if (!agreementDoc) {
      agreementDoc = await propertyAgreementDoc.create({
        partnerId: auth._id,
        propertyId,
      });
    }

    // Already generated
    // if (agreementDoc.HotelPartnerAgreement?.url) {
    //   throw new Error("Hotel Partner Agreement already generated!");
    // }

    // Generate agreement number
    const agreementNumber = `AGR-${Date.now()}`;

    // Generate PDF
    const url = await generatePropertyAgreementPDF(
      {
        property,
        auth,
        partner,
      },
      agreementNumber
    );

    // Ensure nested object exists
    if (!agreementDoc.HotelPartnerAgreement) {
      agreementDoc.HotelPartnerAgreement = {};
    }

    // Save URL
    agreementDoc.HotelPartnerAgreement.url = url;

    await agreementDoc.save();

    console.log("Agreement PDF URL:", url);

    return {
      agreementNumber,
      url,
    };
  } catch (error) {
    console.error("Property agreement generation failed:", error);

    throw error;
  }
};