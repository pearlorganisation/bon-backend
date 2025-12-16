import {
  Document,
  PartnerDocumentAccess,
  DocumentType
} from "../../models/DocumentRequest/documentRequest.model.js";
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

  if(!title || !country || !state ){
     return next ( new CustomError(" title , country , state are required"));
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

    if(allreadyExist){
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
  const {
    title,
    description,
    country,
    state,
    city,
    documentTypeId,
    isActive,
  } = req.body;

  // 1️⃣ Find document
  const document = await Document.findOne({
    _id: id,
    isDeleted:false,
  });

  if (!document) {
    return next(new CustomError("Document not found or soft deleted by admin", 404));
  }

  //ownership check  for sub admins
  if (document.createdBy.toString() !== userId.toString() && req.user.role!="ADMIN") {
    return next(new CustomError("Not allowed to update this document", 403));
  }

     //if new file uploaded 
       if(req.files.document){
        const uploadResult = await uploadFileToCloudinary(
          req.files.document,
          "admin/documents"
        );
        const documentUrl = uploadResult[0].secure_url;
        const public_id = uploadResult[0].public_id;
         document.documentUrl =documentUrl;
         document.public_id= public_id;
       }

  // 2️⃣ Update only provided fields
  if (title !== undefined) document.title = title;
  if (description !== undefined) document.description = description;
  if (country !== undefined) document.country = country.trim().toLowerCase();
  if (state !== undefined) document.state = state.trim().toLowerCase();
  if (city !== undefined) document.city = city.trim().toLowerCase();
  if (documentTypeId !== undefined) document.documentTypeId = documentTypeId;

  if(req.user.role==="Admin"){ //only admin can change  document status
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
  const {isDeleted} =req.body;
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
    message: `Document ${isDeleted?"soft deleted":"restore"} successfully`,
  });
});

// for admin and sub-admins
export const getDocuments =asyncHandler(async(req,res,next)=>{
      
  const userId  =  req.user._id;
  
   let response = {
       isActive:[],
       isInactive :[],
       isDeleted :[]
   }

    let documents= [];

    // check role 
    if( req.user.role=== "ADMIN"){
       documents = await Document.find().sort({ createdAt: 1 });
    }
    else{
       documents =await  Document.find({createdBy:userId}).sort({createdAt:1});
    }
  
       for( let doc of  documents){

          if(doc.isDeleted){
            response[isDeleted].push(doc);
          }
          else if(doc.isActive){
           response[isActive].push(doc);
          }
          else{
           response[isInctive].push(doc);
          }
       }
   
        return  successResponse(res,200,"documents fetch successfully",response);

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



// ==========================================
//  Document Type
// ==========================================


export const createDocumentType= asyncHandler(async (req,res,next)=>{

            const userId = req.user._id;

            let {name , description} =req.body;

            if(!name || !description ) {
                return next(new CustomError("label and description required",400));
            }

             name  =name.trim().toLowerCase();

            let alreadyExist= await DocumentType.findOne({label});

            if(alreadyExist){
              return next(new CustomError("Document Type Allready exist"));
            }

            const data = await DocumentType.create({
              userId,
              name,
              description,
              createdBy: userId // admin only
            });

            successResponse(res,201,"DocumentType Created Successfully",data);


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


  successResponse(res, 200, "Document type deleted successfully",docType);
});


export const getAllDocumentTypes = asyncHandler(async (req, res,next) => {

  const docTypes = await DocumentType.find();
   

  successResponse(res, 200, "Document types fetched successfully", docTypes);
});

