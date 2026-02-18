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
  getPropertyDetailsById,
} from "../../controllers/partner/property.controller.js";
import {
  protect,
  authorizeRoles,
} from "../../middleware/auth/auth.middleware.js";
import {
  getAllPartners,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  upsertCommissionRange,
  getPlatformPlans,
} from "../../controllers/admin/admin.controller.js";

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

route.get("/get-all-partners", authorizeRoles("ADMIN"), getAllPartners);

route.get(
  "/get-patform-plans",
  authorizeRoles("ADMIN", "PARTNER"),
  getPlatformPlans
);
route.post(
  "/change-commission-range",
  authorizeRoles("ADMIN"),
  upsertCommissionRange
);
route.post(
  "/create-subscription-plan",
  authorizeRoles("ADMIN"),
  createSubscriptionPlan
);
route.put(
  "/update-subscription-plan/:planId",
  authorizeRoles("ADMIN"),
 updateSubscriptionPlan
);

route.get(
  "/get-property-by-id/:propertyId",
  authorizeRoles("ADMIN"),
  getPropertyDetailsById
);
export default route;
