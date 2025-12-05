import asyncHandler from "../middleware/asyncHandler.js";
import DocumentRequest from "../models/DocumentRequest.js";
import Property from "../models/Listing/property.model.js";
import CustomError from "../utils/error/customError.js";

/** ----------------------------------------------------------------
 * PARTNER REQUEST TO VIEW DOCUMENTS
 * ----------------------------------------------------------------*/
export const requestDocuments = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { propertyId, documents } = req.body;

  const property = await Property.findById(propertyId);
  if (!property) return next(new CustomError("Property not found", 404));

  if (property.partnerId.toString() !== partnerId.toString()) {
    return next(new CustomError("Not authorized for this property", 403));
  }

  const request = await DocumentRequest.create({
    partnerId,
    propertyId,
    documents,
  });

  res.status(201).json({
    success: true,
    message: "Request sent to admin successfully",
    data: request,
  });
});

/** ----------------------------------------------------------------
 * ADMIN: APPROVE DOCUMENT REQUEST
 * ----------------------------------------------------------------*/
export const approveDocumentRequest = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { expiryHours, message } = req.body;

  const request = await DocumentRequest.findById(requestId);
  if (!request) throw new CustomError("Request not found", 404);

  const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  request.status = "approved";
  request.expiryTime = expiryTime;
  request.adminMessage = message;

  await request.save();

  res.json({
    success: true,
    message: "Request approved and expiry time set",
    data: request,
  });
});

/** ----------------------------------------------------------------
 * ADMIN: REJECT DOCUMENT REQUEST
 * ----------------------------------------------------------------*/
export const rejectDocumentRequest = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { message } = req.body;

  const request = await DocumentRequest.findById(requestId);
  if (!request) throw new CustomError("Request not found", 404);

  request.status = "rejected";
  request.adminMessage = message;

  await request.save();

  res.json({
    success: true,
    message: "Request rejected",
  });
});

/** ----------------------------------------------------------------
 * PARTNER: GET ACCESS TO DOCUMENTS (VALIDATE EXPIRY)
 * ----------------------------------------------------------------*/
export const getDocumentsForPartner = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const requestId = req.params.id;

  const request = await DocumentRequest.findById(requestId);

  if (!request) return next(new CustomError("Request not found", 404));
  if (request.partnerId.toString() !== partnerId.toString())
    return next(new CustomError("Not authorized", 403));

  // Check expiry
  if (request.status === "approved" && new Date() > request.expiryTime) {
    request.status = "expired";
    await request.save();
    return next(new CustomError("Access expired", 410));
  }

  // Update viewed time
  request.viewedAt = new Date();
  await request.save();

  res.json({
    success: true,
    documents: request.documents,
    message: "Documents available for view",
    expiresOn: request.expiryTime,
  });
});

/** ----------------------------------------------------------------
 * ADMIN: GET ALL REQUESTS
 * ----------------------------------------------------------------*/
export const getAllDocumentRequests = asyncHandler(async (req, res) => {
  const requests = await DocumentRequest.find()
    .populate("partnerId", "name email")
    .populate("propertyId", "name");

  res.json({
    success: true,
    data: requests,
  });
});
