import {
  Document,
  PartnerDocumentAccess,
  DocumentType,
} from "./documentRequest.model.js";
import Property from "../../models/Listing/property.model.js";

import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { uploadFileToCloudinary } from "../../utils/cloudinary.js";
import { isAdmin } from "../../middleware/auth/auth.middleware.js";

// ==========================================
// Documents CONTROLLERS
// ==========================================s

export const createDocument = asyncHandler(async (req, res, next) => {
  const { title, description, country, state, city, documentTypeId } = req.body;

  const userId = req.user._id;

  if (!req.files || !req.files.document) {
    return next(new CustomError("Please upload a document file", 400));
  }

  if (!title || !country || !state) {
    return next(new CustomError(" title , country , state are required"));
  }

  if (!documentTypeId) {
    return next(new CustomError("Please specify the document type", 400));
  }

  console.log(req.files.document, "a a ");
  const uploadResult = await uploadFileToCloudinary(
    req.files.document,
    "admin/documents"
  );

  console.log("upload docu ", uploadResult);
  const documentUrl = uploadResult[0].secure_url;
  const public_id = uploadResult[0].public_id;

  const allreadyExist = await Document.findOne({
    documentTypeId,
    country: country.trim().toLowerCase(),
    state: state.trim().toLowerCase(),
  });

  if (allreadyExist) {
    return next(
      new CustomError(
        "Document already exists for this country, state and document type",
        409
      )
    );
  }

  const newDoc = await Document.create({
    title,
    description,
    country: country.trim().toLowerCase(),
    state: state.trim().toLowerCase(),
    city: city ? city.toLowerCase() : null,
    documentTypeId,
    documentUrl,
    public_id,
    createdBy: userId,
  });

  successResponse(res, 201, "Master Document Created Successfully", newDoc);
});

export const updateDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // documentId
  const userId = req.user._id; // sub-admin or admin
  const { title, description, country, state, city, documentTypeId, isActive } =
    req.body;

  // 1️⃣ Find document
  const document = await Document.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!document) {
    return next(
      new CustomError("Document not found or soft deleted by admin", 404)
    );
  }

  //ownership check  for sub admins
  if (
    document.createdBy.toString() !== userId.toString() &&
    req.user.role != "ADMIN"
  ) {
    return next(new CustomError("Not allowed to update this document", 403));
  }

  //if new file uploaded
  if (req.files?.document) {
    const uploadResult = await uploadFileToCloudinary(
      req.files.document,
      "admin/documents"
    );
    const documentUrl = uploadResult[0].secure_url;
    const public_id = uploadResult[0].public_id;
    document.documentUrl = documentUrl;
    document.public_id = public_id;
  }

  // 2️⃣ Update only provided fields
  if (title !== undefined) document.title = title;
  if (description !== undefined) document.description = description;
  if (country !== undefined) document.country = country.trim().toLowerCase();
  if (state !== undefined) document.state = state.trim().toLowerCase();
  if (city !== undefined) document.city = city.trim().toLowerCase();
  if (documentTypeId !== undefined) document.documentTypeId = documentTypeId;

  if (req.user.role === "ADMIN") {
    //only admin can change  document status
    if (isActive !== undefined) document.isActive = isActive;
  }

  try {
    await document.save();

    return res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: document,
    });
  } catch (error) {
    //  Handle UNIQUE index violation
    if (error.code === 11000) {
      return next(
        new CustomError(
          "Active document already exists for this country, state and document type",
          409
        )
      );
    }

    throw error;
  }
});

//only admin allow to soft delete document
export const softDeleteDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // documentId
  const { isDeleted } = req.body;
  // 1️ Find document
  const document = await Document.findById(id);

  if (!document) {
    return next(new CustomError("Document not found", 404));
  }

  // 3️ If already deleted
  if (isDeleted == undefined) {
    return next(new CustomError("delete value  required", 400));
  }

  // 4️ Soft delete
  document.isDeleted = isDeleted;
  await document.save();

  return res.status(200).json({
    success: true,
    message: `Document ${isDeleted ? "soft deleted" : "restore"} successfully`,
  });
});

// for admin and sub-admins
export const getDocuments = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  let documents = [];

  if (req.user.role === "ADMIN") {
    // Admin sees everything (except maybe hard-deleted)
    documents = await Document.find({ isDeleted: false })
      .populate("documentTypeId")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
  } else {
    // Sub-Admin only sees what they created
    documents = await Document.find({ createdBy: userId, isDeleted: false })
      .populate("documentTypeId")
      .sort({ createdAt: -1 });
  }

  // Return a flat array so frontend .filter() works
  return successResponse(res, 200, "Documents fetched successfully", documents);
});
//for admin only

export const getAllDocRequestsForAdmin = asyncHandler(
  async (req, res, next) => {
    const requests = await PartnerDocumentAccess.find({
      status: { $in: ["pending", "approved", "rejected"] },
    })
      .populate("partnerId", "name email")
      .populate("propertyId", "name address city state country")
      .populate({
        path: "requestedDocumentTypes",
        select: "name description",
      })
      .populate({
        path: "assignedDocuments.documentId",
        select: "title documentTypeId country state",
        populate: {
          path: "documentTypeId",
          select: "name",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    /* --------------------------------------------
     GROUP BY STATUS
  -------------------------------------------- */
    const grouped = {
      pending: [],
      approved: [],
      rejected: [],
    };

    requests.forEach((req) => {
      const baseData = {
        _id: req._id,
        partner: req.partnerId,
        property: req.propertyId,

        requestedDocumentTypes: req.requestedDocumentTypes.map((type) => ({
          _id: type._id,
          name: type.name,
          description: type.description,
        })),

        status: req.status,
        partnerNote: req.partnerNote,
        requestedAt: req.requestedAt,
      };

      if (req.status === "pending") {
        grouped.pending.push(baseData);
      }

      if (req.status === "approved") {
        grouped.approved.push({
          ...baseData,
          assignedDocuments: req.assignedDocuments.map((doc) => ({
            _id: doc.documentId._id,
            title: doc.documentId.title,
            state: doc.documentId.state,
            country: doc.documentId.country,
            documentType: doc.documentId.documentTypeId,
            assignedAt: doc.assignedAt,
          })),
          accessStartDate: req.accessStartDate,
          accessEndDate: req.accessEndDate,
          approvedAt: req.updatedAt,
        });
      }

      if (req.status === "rejected") {
        grouped.rejected.push({
          ...baseData,
          adminNote: req.adminNote || "No reason provided",
          rejectedAt: req.updatedAt,
        });
      }
    });

    successResponse(res, 200, "All document requests fetched", grouped);
  }
);

// ADMIN ONLY
export const getDocumentsByQuery = asyncHandler(async (req, res) => {
  const { country, state, city, documentTypeId } = req.query;

  const filter = { isActive: true };

  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (country) {
    filter.country = { $regex: escapeRegex(country), $options: "i" };
  }

  if (state) {
    filter.state = { $regex: escapeRegex(state), $options: "i" };
  }

  if (city) {
    filter.city = { $regex: escapeRegex(city), $options: "i" };
  }

  if (documentTypeId && mongoose.Types.ObjectId.isValid(documentTypeId)) {
    filter.documentTypeId = new mongoose.Types.ObjectId(documentTypeId);
  }

  const documents = await Document.find(filter)
    .populate("documentTypeId", "name description")
    .populate("createdBy", "name email")
    .lean();

  successResponse(res, 200, "Documents fetched successfully", documents);
});

// ADMIN ONLY
export const grantDocumentAccess = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { accessDurationDays = 7, adminNote, selectedDocumentIds } = req.body;

  /* --------------------------------------------
     1️ FETCH REQUEST
  -------------------------------------------- */
  const request = await PartnerDocumentAccess.findById(requestId)
    .populate("propertyId", "country state city")
    .populate("requestedDocumentTypes", "_id");

  if (!request) {
    return next(new CustomError("Document-Request not found", 404));
  }

  if (request.status !== "pending") {
    return next(new CustomError("Only pending requests can be approved", 400));
  }

  /* --------------------------------------------
     2️ VALIDATE DOCUMENT SELECTION
  -------------------------------------------- */
  if (
    !selectedDocumentIds ||
    !Array.isArray(selectedDocumentIds) ||
    selectedDocumentIds.length === 0
  ) {
    return next(
      new CustomError("Please select at least one document to assign.", 400)
    );
  }

  /* --------------------------------------------
     3️ FETCH & VALIDATE DOCUMENTS
  -------------------------------------------- */
  const docsToAssign = await Document.find({
    _id: { $in: selectedDocumentIds },
    isActive: true,
  });

  if (docsToAssign.length !== selectedDocumentIds.length) {
    return next(
      new CustomError("Some selected documents are invalid or inactive.", 400)
    );
  }

  /* --------------------------------------------
     4️ STRICT VALIDATION (TYPE + LOCATION)
  -------------------------------------------- */
  const requestedTypeIds = request.requestedDocumentTypes.map((t) =>
    t._id.toString()
  );

  docsToAssign.forEach((doc) => {
    // 1. Document type check
    if (!requestedTypeIds.includes(doc.documentTypeId.toString())) {
      throw new CustomError(
        "One or more documents do not match requested document types",
        400
      );
    }

    // 2. Location check (FIX: Added .toLowerCase() and .trim() to both sides)
    const docCountry = (doc.country || "").trim().toLowerCase();
    const docState = (doc.state || "").trim().toLowerCase();
    const propCountry = (request.propertyId.country || "").trim().toLowerCase();
    const propState = (request.propertyId.state || "").trim().toLowerCase();

    if (docCountry !== propCountry || docState !== propState) {
      console.log("Mismatch detected:");
      console.log(`Document: ${docCountry}, ${docState}`);
      console.log(`Property: ${propCountry}, ${propState}`);

      throw new CustomError(
        `Document "${doc.title}" does not match the property location (${request.propertyId.country}, ${request.propertyId.state})`,
        400
      );
    }
  });

  /* --------------------------------------------
     5️ ASSIGN DOCUMENTS
  -------------------------------------------- */
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + Number(accessDurationDays));

  request.assignedDocuments = docsToAssign.map((doc) => ({
    documentId: doc._id,
    assignedAt: new Date(),
  }));

  request.accessStartDate = startDate;
  request.accessEndDate = endDate;
  request.status = "approved";
  request.adminNote = adminNote || "Access granted by Admin";

  await request.save();

  successResponse(
    res,
    200,
    "Access granted and documents assigned successfully",
    request
  );
});
// ADMIN ONLY [ pending  ,rejected ]
export const toggleDocumentRequestStatus = asyncHandler(
  async (req, res, next) => {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const request = await PartnerDocumentAccess.findById(requestId);

    if (!request) {
      return next(new CustomError("Request not found", 404));
    }

    // Allowed transitions only
    if (request.status === "pending") {
      request.status = "rejected";
    } else if (request.status === "rejected") {
      request.status = "pending";
    } else {
      return next(
        new CustomError("Only pending or rejected requests can be updated", 400)
      );
    }

    // Update admin note (optional)
    if (adminNote !== undefined) {
      request.adminNote = adminNote;
    }

    await request.save();

    successResponse(res, 200, "Request status updated successfully", {
      _id: request._id,
      status: request.status,
      adminNote: request.adminNote,
    });
  }
);

// ==========================================
// PARTNER DOCUMENT ACCESS CONTROLLERS
// ==========================================

//parnter only
// FIX: Allow overlapping requests only if types are different
export const requestDocumentAccess = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { propertyId, documentTypeIds, partnerNote } = req.body;

  if (!Array.isArray(documentTypeIds) || documentTypeIds.length === 0) {
    return next(new CustomError("Document types are required", 400));
  }

  // 1️ Property ownership check
  const property = await Property.findOne({ _id: propertyId, partnerId });
  if (!property) {
    return next(new CustomError("Property not found or unauthorized", 403));
  }

  // 2️ Fetch document type names (for messages)
  const docTypes = await DocumentType.find(
    { _id: { $in: documentTypeIds } },
    { name: 1 }
  );

  if (docTypes.length !== documentTypeIds.length) {
    return next(new CustomError("Invalid document type selected", 400));
  }

  const typeMap = new Map(docTypes.map((d) => [d._id.toString(), d.name]));

  // 3️ Find conflicting requests
  const existingRequests = await PartnerDocumentAccess.find({
    propertyId,
    status: { $in: ["pending", "approved"] },
  });

  const now = new Date();
  const conflictTypes = [];

  for (const record of existingRequests) {
    for (const typeId of documentTypeIds) {
      const match = record.requestedDocumentTypes.some((id) =>
        id.equals(typeId)
      );

      if (!match) continue;

      const name = typeMap.get(typeId.toString());

      if (record.status === "pending") {
        conflictTypes.push(`${name} (pending)`);
      } else if (
        record.status === "approved" &&
        record.accessEndDate &&
        record.accessEndDate > now
      ) {
        conflictTypes.push(`${name} (active)`);
      }
    }
  }

  if (conflictTypes.length > 0) {
    return next(
      new CustomError(
        `Requests already exist for: ${conflictTypes.join(", ")}`,
        400
      )
    );
  }

  // 4️⃣ Create request
  const newRequest = await PartnerDocumentAccess.create({
    partnerId,
    propertyId,
    requestedDocumentTypes: documentTypeIds,
    status: "pending",
    partnerNote: partnerNote || "",
    requestedAt: Date.now(),
  });

  successResponse(res, 201, "Request sent to admin successfully", newRequest);
});

// FIX: Return merged documents from all active requests
export const getMyPropertyDocuments = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { propertyId } = req.params;
  const now = new Date();

  /* --------------------------------------------
     1️ ACTIVE (APPROVED & NOT EXPIRED)
  -------------------------------------------- */
  const activeAccessRecords = await PartnerDocumentAccess.find({
    propertyId,
    partnerId,
    status: "approved",
    accessEndDate: { $gt: now },
  })
    .populate({
      path: "assignedDocuments.documentId",
      select:
        "title description documentUrl public_id documentTypeId country state city",
      populate: {
        path: "documentTypeId",
        select: "name description",
      },
    })
    .lean();

  /* --------------------------------------------
     2️ EXPIRED (STATUS BASED)
  -------------------------------------------- */
  const expiredAccessRecords = await PartnerDocumentAccess.find({
    propertyId,
    partnerId,
    status: "expired",
  })
    .populate({
      path: "assignedDocuments.documentId",
      select: "title description documentTypeId country state city",
      populate: {
        path: "documentTypeId",
        select: "name description",
      },
    })
    .lean();

  /* --------------------------------------------
     3️ PENDING & REJECTED REQUESTS
  -------------------------------------------- */
  const pendingAndRejectedRecords = await PartnerDocumentAccess.find({
    propertyId,
    partnerId,
    status: { $in: ["pending", "rejected"] },
  })
    .populate({
      path: "requestedDocumentTypes",
      select: "name description",
    })
    .lean();

  /* --------------------------------------------
     4️ FORMAT ACTIVE DOCUMENTS
  -------------------------------------------- */
  const activeDocuments = [];

  activeAccessRecords.forEach((record) => {
    record.assignedDocuments?.forEach((doc) => {
      activeDocuments.push({
        _id: doc.documentId._id,
        title: doc.documentId.title,
        description: doc.documentId.description,
        documentUrl: doc.documentId.documentUrl,
        public_id: doc.documentId.public_id,

        documentType: doc.documentId.documentTypeId,
        location: {
          country: doc.documentId.country,
          state: doc.documentId.state,
          city: doc.documentId.city,
        },

        adminNote: record.adminNote,
        assignedAt: doc.assignedAt,
        validUntil: record.accessEndDate,
        status: "active",
      });
    });
  });

  /* --------------------------------------------
     5️ FORMAT EXPIRED DOCUMENTS (NO URL)
  -------------------------------------------- */
  const expiredDocuments = [];

  expiredAccessRecords.forEach((record) => {
    record.assignedDocuments?.forEach((doc) => {
      expiredDocuments.push({
        _id: doc.documentId._id,
        title: doc.documentId.title,
        description: doc.documentId.description,

        documentType: doc.documentId.documentTypeId,
        location: {
          country: doc.documentId.country,
          state: doc.documentId.state,
          city: doc.documentId.city,
        },

        assignedAt: doc.assignedAt,
        expiredAt: record.accessEndDate,
        status: "expired",
      });
    });
  });

  /* --------------------------------------------
     6️ FORMAT PENDING & REJECTED TYPES
  -------------------------------------------- */
  const pendingTypes = [];
  const rejectedTypes = [];

  pendingAndRejectedRecords.forEach((record) => {
    record.requestedDocumentTypes.forEach((type) => {
      const base = {
        _id: type._id,
        name: type.name,
        description: type.description,
        requestedAt: record.createdAt,
      };

      if (record.status === "pending") {
        pendingTypes.push(base);
      }

      if (record.status === "rejected") {
        rejectedTypes.push({
          ...base,
          adminNote: record.adminNote || "",
          rejectedAt: record.updatedAt,
        });
      }
    });
  });

  successResponse(res, 200, "Documents fetched successfully", {
    activeDocuments,
    expiredDocuments,
    pendingTypes,
    rejectedTypes,
  });
});

// ==========================================d
//  Document Type
// ==========================================

export const createDocumentType = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  let { name, description } = req.body;

  if (!name || !description) {
    return next(new CustomError("label and description required", 400));
  }

  name = name.trim().toLowerCase();

  let alreadyExist = await DocumentType.findOne({ name });

  if (alreadyExist) {
    return next(new CustomError("Document Type Allready exist"));
  }

  const data = await DocumentType.create({
    userId,
    name,
    description,
    createdBy: userId, // admin only
  });

  successResponse(res, 201, "DocumentType Created Successfully", data);
});

export const updateDocumentType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  let { name, description } = req.body;
  console.log(id);
  const docType = await DocumentType.findById(id);

  if (!docType) {
    return next(new CustomError("Document type not found", 404));
  }

  if (name) {
    name = name.trim().toLowerCase();

    const exists = await DocumentType.findOne({
      _id: { $ne: id },
      name,
    });

    if (exists) {
      return next(new CustomError("Document type name already exists", 409));
    }

    docType.name = name;
  }

  if (description) {
    docType.description = description;
  }

  await docType.save();

  successResponse(res, 200, "Document type updated successfully", docType);
});

export const deleteDocumentType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const docType = await DocumentType.findById(id);

  if (!docType) {
    return next(new CustomError("Document type not found", 404));
  }
  docType.isActive = false;
  docType.save();

  successResponse(res, 200, "Document type deleted successfully", docType);
});

export const getAllDocumentTypes = asyncHandler(async (req, res, next) => {
  const docTypes = await DocumentType.find({ isActive: true });

  successResponse(res, 200, "Document types fetched successfully", docTypes);
});
