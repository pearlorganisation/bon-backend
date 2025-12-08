import {
  AdminDocument,
  PropertyDocumentAccess,
} from "../../models/DocumentRequest/documentRequest.model.js";
import Property from "../../models/Listing/property.model.js";

import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { uploadFileToCloudinary } from "../../utils/cloudinary.js";

// ADMIN CONTROLLERS

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
    documentType, // Save the type
    documentUrl,
    public_id,
  });

  successResponse(res, 201, "Master Document Created Successfully", newDoc);
});

// 2. Admin views pending requests from Partners
export const getPendingDocRequests = asyncHandler(async (req, res, next) => {
  const requests = await PropertyDocumentAccess.find({ status: "pending" })
    .populate("partnerId", "name email")
    .populate("propertyId", "name address city state");

  successResponse(res, 200, "Pending requests fetched", requests);
});

// 3. Admin Assigns Documents & Sets Time Window
export const grantDocumentAccess = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { accessDurationDays, adminNote } = req.body;

  const request = await PropertyDocumentAccess.findById(requestId).populate(
    "propertyId"
  );
  if (!request) return next(new CustomError("Request not found", 404));

  const propertyState = request.propertyId.state.toLowerCase();
  const propertyCountry = request.propertyId.country.toLowerCase();

  const requestedTypes = request.requestedDocumentTypes;

  const matchingDocs = await AdminDocument.find({
    state: { $regex: new RegExp(`^${propertyState}$`, "i") },
    country: { $regex: new RegExp(`^${propertyCountry}$`, "i") },
    isActive: true,
    documentType: { $in: requestedTypes },
  });

  if (matchingDocs.length === 0) {
    return next(
      new CustomError(
        `No master documents found for state: ${propertyState} matching the requested types.`,
        404
      )
    );
  }

  // Calculate Dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + parseInt(accessDurationDays || 7));

  // Update Request
  request.assignedDocuments = matchingDocs.map((doc) => ({
    documentId: doc._id,
  }));
  request.accessStartDate = startDate;
  request.accessEndDate = endDate;
  request.status = "approved";
  request.adminNote =
    adminNote ||
    "Access granted based on property location and requested types.";

  await request.save();

  successResponse(
    res,
    200,
    "Access granted and specific documents assigned",
    request
  );
});

// PARTNER CONTROLLERS

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
    requestedDocumentTypes: documentTypes, // Store the requested types
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
      select: "title description documentUrl documentType", // Added documentType to selection
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
