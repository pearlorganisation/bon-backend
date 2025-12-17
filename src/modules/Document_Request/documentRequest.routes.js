import express from "express";
import multer from "multer";

import {
  // =======================
  // DOCUMENT (MASTER)
  // =======================
  createDocument,
  updateDocument,
  softDeleteDocument,
  getDocuments,
  getDocumentsByQuery,

  // =======================
  // ADMIN – REQUEST HANDLING
  // =======================
  getAllDocRequestsForAdmin,
  grantDocumentAccess,
  toggleDocumentRequestStatus,

  // =======================
  // PARTNER
  // =======================
  requestDocumentAccess,
  getMyPropertyDocuments,

  // =======================
  // DOCUMENT TYPE
  // =======================
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  getAllDocumentTypes,
} from "./documentRequest.controller.js";

import {
  protect,
  authorizeRoles,
} from "../../middleware/auth/auth.middleware.js";

const router = express.Router();

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });
const uploadFields = upload.fields([{ name: "document", maxCount: 1 }]);

/* =========================================================
   DOCUMENT (MASTER) ROUTES
========================================================= */

// Create document (Admin / Sub-Admin)
router.post(
  "/documents",
  protect,
  authorizeRoles("ADMIN", "SUB_ADMIN"),
  uploadFields,
  createDocument
);

// Update document
router.put(
  "/documents/:id",
  protect,
  authorizeRoles("ADMIN", "SUB_ADMIN"),
  uploadFields,
  updateDocument
);

// Soft delete document (Admin only)
router.patch(
  "/documents/:id/soft-delete",
  protect,
  authorizeRoles("ADMIN"),
  softDeleteDocument
);

// Get documents (Admin & Sub-Admin)
router.get(
  "/documents",
  protect,
  authorizeRoles("ADMIN", "SUB_ADMIN"),
  getDocuments
);

// Get documents by query (Admin only)
router.get(
  "/documents/search",
  protect,
  authorizeRoles("ADMIN"),
  getDocumentsByQuery
);

/* =========================================================
   DOCUMENT REQUESTS – ADMIN
========================================================= */

// Get all document access requests
router.get(
  "/admin/document-requests",
  protect,
  authorizeRoles("ADMIN"),
  getAllDocRequestsForAdmin
);

// Grant document access
router.post(
  "/admin/document-requests/:requestId/grant",
  protect,
  authorizeRoles("ADMIN"),
  grantDocumentAccess
);

// Toggle request status (pending ↔ rejected)
router.patch(
  "/admin/document-requests/:requestId/toggle",
  protect,
  authorizeRoles("ADMIN"),
  toggleDocumentRequestStatus
);

/* =========================================================
   PARTNER DOCUMENT ACCESS
========================================================= */

// Request document access
router.post(
  "/partner/document-requests",
  protect,
  authorizeRoles("PARTNER"),
  requestDocumentAccess
);

// Get my property documents
router.get(
  "/partner/properties/:propertyId/documents",
  protect,
  authorizeRoles("PARTNER"),
  getMyPropertyDocuments
);

/* =========================================================
   DOCUMENT TYPE (ADMIN)
========================================================= */

// Create document type
router.post(
  "/document-types",
  protect,
  authorizeRoles("ADMIN"),
  createDocumentType
);

// Update document type
router.put(
  "/document-types/:id",
  protect,
  authorizeRoles("ADMIN"),
  updateDocumentType
);

// Delete document type
router.patch(
  "/document-types/:id",
  protect,
  authorizeRoles("ADMIN"),
  deleteDocumentType
);

// Get all document types
router.get("/document-types", protect, authorizeRoles("ADMIN","SUB_ADMIN","PARTNER"), getAllDocumentTypes);

export default router;
