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

  const uploadResult = await uploadFileToCloudinary(
    req.files.document,
    "admin/documents"
  );
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
  if (req.files.document) {
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

  if (req.user.role === "Admin") {
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
  // 1️⃣ Find document
  const document = await Document.findById(id);

  if (!document) {
    return next(new CustomError("Document not found", 404));
  }

  // 3️⃣ If already deleted
  if (!isDeleted) {
    return next(new CustomError("delete value  required", 400));
  }

  // 4️⃣ Soft delete
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

  let response = {
    isActive: [],
    isInactive: [],
    isDeleted: [],
  };

  let documents = [];

  // check role
  if (req.user.role === "ADMIN") {
    documents = await Document.find().sort({ createdAt: 1 });
  } else {
    documents = await Document.find({ createdBy: userId }).sort({
      createdAt: 1,
    });
  }

  for (let doc of documents) {
    if (doc.isDeleted) {
      response[isDeleted].push(doc);
    } else if (doc.isActive) {
      response[isActive].push(doc);
    } else {
      response[isInctive].push(doc);
    }
  }

  return successResponse(res, 200, "documents fetch successfully", response);
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
export const getDocumentsByQuery = asyncHandler(async (req, res, next) => {
  const { country, state, city, documentTypeId } = req.query;

  const filter = { isActive: true };

  /* --------------------------------------------
     LOCATION FILTERS (CASE-INSENSITIVE)
  -------------------------------------------- */
  if (country) {
    filter.country = { $regex: new RegExp(`^${country}$`, "i") };
  }

  if (state) {
    filter.state = { $regex: new RegExp(`^${state}$`, "i") };
  }

  if (city) {
    filter.city = { $regex: new RegExp(`^${city}$`, "i") };
  }

  /* --------------------------------------------
     DOCUMENT TYPE FILTER (ObjectId)
  -------------------------------------------- */
  if (documentTypeId) {
    filter.documentTypeId = documentTypeId;
  }

  const documents = await Document.find(filter)
    .populate({
      path: "documentTypeId",
      select: "name description",
    })
    .populate({
      path: "createdBy",
      select: "name email",
    })
    .sort({ createdAt: -1 })
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
    return next(new CustomError("Request not found", 404));
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
    // document type check
    if (!requestedTypeIds.includes(doc.documentTypeId.toString())) {
      throw new CustomError(
        "One or more documents do not match requested document types",
        400
      );
    }

    // location check
    if (
      doc.country !== request.propertyId.country ||
      doc.state !== request.propertyId.state
    ) {
      throw new CustomError(
        "One or more documents do not match property location",
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
    PartnerNote: partnerNote || "",
    requestedAt: new Date.now(),
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
      select: "title description documentTypeId country state city", // ❌ no url
      populate: {
        path: "documentTypeId",
        select: "name description",
      },
    })
    .lean();

  /* --------------------------------------------
     3️ PENDING REQUESTS
  -------------------------------------------- */
  const pendingRecords = await PartnerDocumentAccess.find({
    propertyId,
    partnerId,
    status: "pending",
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

        assignedAt: doc.assignedAt,
        validUntil: record.accessEndDate,
        status: "active",
      });
    });
  });

  /* --------------------------------------------
     5️⃣ FORMAT EXPIRED DOCUMENTS (NO URL)
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
     6️⃣ FORMAT PENDING TYPES (UNIQUE)
  -------------------------------------------- */
  const pendingTypeMap = new Map();

  pendingRecords.forEach((record) => {
    record.requestedDocumentTypes.forEach((type) => {
      pendingTypeMap.set(type._id.toString(), type);
    });
  });

  const pendingTypes = Array.from(pendingTypeMap.values());

  /* --------------------------------------------
     7️⃣ RESPONSE
  -------------------------------------------- */
  successResponse(res, 200, "Documents fetched successfully", {
    activeDocuments,
    expiredDocuments,
    pendingTypes,
  });
});

// ==========================================
//  Document Type
// ==========================================

export const createDocumentType = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  let { name, description } = req.body;

  if (!name || !description) {
    return next(new CustomError("label and description required", 400));
  }

  name = name.trim().toLowerCase();

  let alreadyExist = await DocumentType.findOne({ label });

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

  const docType = await DocumentType.findByIdAndDelete(id);

  if (!docType) {
    return next(new CustomError("Document type not found", 404));
  }

  successResponse(res, 200, "Document type deleted successfully", docType);
});

export const getAllDocumentTypes = asyncHandler(async (req, res, next) => {
  const docTypes = await DocumentType.find();

  successResponse(res, 200, "Document types fetched successfully", docTypes);
});
