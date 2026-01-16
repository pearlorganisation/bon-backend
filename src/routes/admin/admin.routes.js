import express from "express";
const route = express.Router();
import {
  getSubAdminSessionHistory,
  getTodaySubAdminSession,
} from "../../controllers/sub_admin/sub_admin.session.controller.js";
import {
  getPropertyApprovalRequests,
  approveRejectProperty,
  assignPropertyToPartner,
} from "../../controllers/partner/property.controller.js";
import {
  protect,
  authorizeRoles,
} from "../../middleware/auth/auth.middleware.js";

route.use(protect);

route.get(
  "/get-subAdmin-sessions-history/:id",
  authorizeRoles("ADMIN", "SUB_ADMIN"),
  getSubAdminSessionHistory
);
route.get(
  "/get-today-subadmins-session",
  authorizeRoles("ADMIN", "SUB_ADMIN"),
  getTodaySubAdminSession
);

route.get(
  "properties/approval-requests",
  authorizeRoles("ADMIN"),
  getPropertyApprovalRequests
);

route.patch(
  "/properties/:propertyId/approve",
  authorizeRoles("ADMIN"),
  approveRejectProperty
);
route.patch(
  "/assign-property/:propertyId",
  authorizeRoles("ADMIN"),
  assignPropertyToPartner
);

export default route;
