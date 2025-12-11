import {
  AdminDocument,
  PropertyDocumentAccess,
} from "../../models/DocumentRequest/documentRequest.model.js";
import Property from "../../models/Listing/property.model.js";

import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { uploadFileToCloudinary } from "../../utils/cloudinary.js";

// ==========================================
// ADMIN CONTROLLERS
// ==========================================s

export const createMasterDocument = asyncHandler(async (req, res, next) => {
  const { title, description, country, state, city, documentType } = req.body;

  if (!req.files || !req.files.document) {
    return next(new CustomError("Please upload a document file", 400));
  }

  if (!documentType) {
    return next(new CustomError("Please specify the document type", 400));
  }

  const uploadResult = await uploadFileToCloudinary(
    req.files.document,
    "admin/documents"
  );
  const documentUrl = uploadResult[0].secure_url;
  const public_id = uploadResult[0].public_id;

  const newDoc = await AdminDocument.create({
    title,
    description,
    country: country.toLowerCase(),
    state: state.toLowerCase(),
    city: city ? city.toLowerCase() : null,
    documentType,
    documentUrl,
    public_id,
  });

  successResponse(res, 201, "Master Document Created Successfully", newDoc);
});

export const getPendingDocRequests = asyncHandler(async (req, res, next) => {
  const requests = await PropertyDocumentAccess.find({ status: "pending" })
    .populate("partnerId", "name email")
    .populate("propertyId", "name address city state country")
    .sort({ createdAt: -1 });

  successResponse(res, 200, "Pending requests fetched", requests);
});

export const getAdminDocuments = asyncHandler(async (req, res, next) => {
  const { country, state, city, documentType } = req.query;

  const filter = { isActive: true };

  // Case-insensitive regex matching
  if (country) filter.country = { $regex: new RegExp(`^${country}$`, "i") };
  if (state) filter.state = { $regex: new RegExp(`^${state}$`, "i") };
  if (city) filter.city = { $regex: new RegExp(`^${city}$`, "i") };

  if (documentType) filter.documentType = documentType;

  const documents = await AdminDocument.find(filter).sort({ createdAt: -1 });

  successResponse(res, 200, "Admin documents fetched successfully", documents);
});

export const grantDocumentAccess = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { accessDurationDays, adminNote, selectedDocumentIds } = req.body;

  const request = await PropertyDocumentAccess.findById(requestId);
  if (!request) return next(new CustomError("Request not found", 404));

  if (
    !selectedDocumentIds ||
    !Array.isArray(selectedDocumentIds) ||
    selectedDocumentIds.length === 0
  ) {
    return next(
      new CustomError("Please select at least one document to assign.", 400)
    );
  }

  const docsToAssign = await AdminDocument.find({
    _id: { $in: selectedDocumentIds },
    isActive: true,
  });

  if (docsToAssign.length === 0) {
    return next(
      new CustomError(
        "The selected documents could not be found or are inactive.",
        404
      )
    );
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + parseInt(accessDurationDays || 7));

  request.assignedDocuments = docsToAssign.map((doc) => ({
    documentId: doc._id,
    assignedAt: new Date(),
  }));

  request.accessStartDate = startDate;
  request.accessEndDate = endDate;
  request.status = "approved";
  request.adminNote = adminNote || "Access granted manually by Admin.";

  await request.save();

  successResponse(
    res,
    200,
    "Access granted and selected documents assigned successfully",
    request
  );
});

// ==========================================
// PARTNER CONTROLLERS
// ==========================================

// FIX: Allow overlapping requests only if types are different
export const requestDocumentAccess = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { propertyId, documentTypes } = req.body;

  if (
    !documentTypes ||
    !Array.isArray(documentTypes) ||
    documentTypes.length === 0
  ) {
    return next(
      new CustomError("Please specify at least one document type", 400)
    );
  }

  const property = await Property.findOne({ _id: propertyId, partnerId });
  if (!property)
    return next(new CustomError("Property not found or unauthorized", 403));

  // 1. Find all active or pending requests for this property
  const existingRequests = await PropertyDocumentAccess.find({
    propertyId,
    status: { $in: ["pending", "approved"] },
  });

  const now = new Date();
  const conflictTypes = [];

  // 2. Check each requested type against existing records
  for (const reqType of documentTypes) {
    for (const record of existingRequests) {
      // Check if this specific type was requested in this record
      if (record.requestedDocumentTypes.includes(reqType)) {
        // If it's pending, it's a conflict
        if (record.status === "pending") {
          conflictTypes.push(`${reqType} (Pending)`);
        }
        // If it's approved, check if expired
        else if (record.status === "approved") {
          if (record.accessEndDate > now) {
            conflictTypes.push(`${reqType} (Already Active)`);
          }
        }
      }
    }
  }

  if (conflictTypes.length > 0) {
    return next(
      new CustomError(
        `Requests exist for: ${conflictTypes.join(
          ", "
        )}. Please wait or check your documents.`,
        400
      )
    );
  }

  // 3. Create new request for the clean types
  const newRequest = await PropertyDocumentAccess.create({
    partnerId,
    propertyId,
    requestedDocumentTypes: documentTypes,
    status: "pending",
  });

  successResponse(res, 201, "Request sent to Admin successfully", newRequest);
});

// FIX: Return merged documents from all active requests
export const getMyPropertyDocuments = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { propertyId } = req.params;
  const now = new Date();

  // Find ALL approved requests that haven't expired
  const accessRecords = await PropertyDocumentAccess.find({
    propertyId,
    partnerId,
    status: "approved",
    accessEndDate: { $gt: now }, // Only valid dates
  }).populate({
    path: "assignedDocuments.documentId",
    select: "title description documentUrl documentType public_id",
  });

  // Find pending requests to show status on frontend
  const pendingRecords = await PropertyDocumentAccess.find({
    propertyId,
    partnerId,
    status: "pending",
  });

  // Collect pending types
  let pendingTypes = [];
  pendingRecords.forEach((rec) => {
    pendingTypes = [...pendingTypes, ...rec.requestedDocumentTypes];
  });

  // Merge all assigned documents into a single array
  let allDocuments = [];
  accessRecords.forEach((record) => {
    if (record.assignedDocuments) {
      const docsWithValidity = record.assignedDocuments.map((doc) => ({
        ...doc.toObject(),
        validUntil: record.accessEndDate,
      }));
      allDocuments = [...allDocuments, ...docsWithValidity];
    }
  });

  successResponse(res, 200, "Documents fetched successfully", {
    documents: allDocuments,
    pendingTypes: [...new Set(pendingTypes)], // Unique pending types
  });
});
