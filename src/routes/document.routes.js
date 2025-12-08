import express from "express";
import multer from "multer";

import {
  createMasterDocument,
  getPendingDocRequests,
  grantDocumentAccess,
  requestDocumentAccess,
  getMyPropertyDocuments,
} from "../controllers/DocumentRequest/documentRequest.controller.js";
import { protect, authorizeRoles } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });
const uploadSingle = upload.fields([{ name: "document", maxCount: 1 }]);

// PARTNER ROUTES
router.post("/request-access", protect, requestDocumentAccess);
router.get("/view-documents/:propertyId", protect, getMyPropertyDocuments);

// ADMIN ROUTES
router.post(
  "/admin/create-master-doc",
  protect,
  authorizeRoles("ADMIN"),
  uploadSingle,
  createMasterDocument
);

router.get(
  "/admin/pending-requests",
  protect,
  authorizeRoles("ADMIN"),
  getPendingDocRequests
);

router.put(
  "/admin/grant-access/:requestId",
  protect,
  authorizeRoles("ADMIN"),
  grantDocumentAccess
);

export default router;
