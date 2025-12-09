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
// ==========================================

// 1. Admin creates a master document
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

// 2. Admin views pending requests from Partners
export const getPendingDocRequests = asyncHandler(async (req, res, next) => {
  const requests = await PropertyDocumentAccess.find({ status: "pending" })
    .populate("partnerId", "name email")
    .populate("propertyId", "name address city state country");

  successResponse(res, 200, "Pending requests fetched", requests);
});

// 3. [NEW] Get Admin Documents (Filter by State/Country/City)
// This helps the frontend populate the list for the Admin to choose from
export const getAdminDocuments = asyncHandler(async (req, res, next) => {
  const { country, state, city, documentType } = req.query;

  const filter = { isActive: true };

  // Case-insensitive regex matching
  if (country) filter.country = { $regex: new RegExp(`^${country}$`, "i") };
  if (state) filter.state = { $regex: new RegExp(`^${state}$`, "i") };
  if (city) filter.city = { $regex: new RegExp(`^${city}$`, "i") };

  // Exact match for type
  if (documentType) filter.documentType = documentType;

  const documents = await AdminDocument.find(filter).sort({ createdAt: -1 });

  successResponse(res, 200, "Admin documents fetched successfully", documents);
});

// 4. [UPDATED] Admin Assigns Documents Manually
export const grantDocumentAccess = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;

  // Now accepting selectedDocumentIds from frontend
  const { accessDurationDays, adminNote, selectedDocumentIds } = req.body;

  const request = await PropertyDocumentAccess.findById(requestId);
  if (!request) return next(new CustomError("Request not found", 404));

  // Validate that admin sent documents
  if (
    !selectedDocumentIds ||
    !Array.isArray(selectedDocumentIds) ||
    selectedDocumentIds.length === 0
  ) {
    return next(
      new CustomError("Please select at least one document to assign.", 400)
    );
  }

  // Fetch the actual documents to ensure they exist
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

  // Calculate Dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + parseInt(accessDurationDays || 7));

  // Update Request with MANUAL selection
  request.assignedDocuments = docsToAssign.map((doc) => ({
    documentId: doc._id,
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

// 1. Partner Requests Access for a Property
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

  const existingRequest = await PropertyDocumentAccess.findOne({
    propertyId,
    status: { $in: ["pending", "approved"] },
  });

  if (existingRequest && existingRequest.status === "approved") {
    if (new Date() < new Date(existingRequest.accessEndDate)) {
      return next(
        new CustomError("You already have active access to documents", 400)
      );
    }
  } else if (existingRequest && existingRequest.status === "pending") {
    return next(new CustomError("A request is already pending", 400));
  }

  const newRequest = await PropertyDocumentAccess.create({
    partnerId,
    propertyId,
    requestedDocumentTypes: documentTypes,
    status: "pending",
  });

  successResponse(res, 201, "Request sent to Admin successfully", newRequest);
});

// 2. Partner Views Assigned Documents (Time-Restricted)
export const getMyPropertyDocuments = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { propertyId } = req.params;

  const accessRecord = await PropertyDocumentAccess.findOne({
    propertyId,
    partnerId,
    status: "approved",
  })
    .populate({
      path: "assignedDocuments.documentId",
      select: "title description documentUrl documentType",
    })
    .sort({ createdAt: -1 });

  if (!accessRecord) {
    return next(
      new CustomError("No active document access found for this property", 404)
    );
  }

  const now = new Date();
  const isExpired = now > new Date(accessRecord.accessEndDate);

  if (isExpired) {
    accessRecord.status = "expired";
    await accessRecord.save();
    return next(
      new CustomError("Document access has expired. Please request again.", 403)
    );
  }

  successResponse(res, 200, "Documents fetched successfully", {
    validUntil: accessRecord.accessEndDate,
    documents: accessRecord.assignedDocuments,
  });
});
