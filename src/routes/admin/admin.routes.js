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
  releasePartnerMonthlyPayout,
  getPartnerMonthlyPayouts,
  getAdminMonthlyFinance,
  confirmAdminMonthlyPayout,
  getWeeklySalesFromBookings,
  getTopPerformerHotels,
  getMonthlyRefundsData,
  getMonthlySubscriptionsData,
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
  "/get-property-by-id/:propertyId",
  authorizeRoles("ADMIN"),
  getPropertyDetailsById
);


// plan and subscription
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



//payout apis 

route.post(
  "/release-partner-payout",
  authorizeRoles("ADMIN"),
  releasePartnerMonthlyPayout
);
route.post(
  "/confirm-admin-payout",
  authorizeRoles("ADMIN"),
  confirmAdminMonthlyPayout
);

// admin  Payment & Finance dashborad  api
route.get(
  "/get-partner-monthly-payout",
  authorizeRoles("ADMIN"),
  getPartnerMonthlyPayouts
);
route.get(
  "/get-admin-monthly-finance",
  authorizeRoles("ADMIN"),
  getAdminMonthlyFinance
);
route.get(
  "/get-weekly-sales",
  authorizeRoles("ADMIN"),
  getWeeklySalesFromBookings
);

route.get(
  "/get-top-permormers",
  authorizeRoles("ADMIN"),
  getTopPerformerHotels
);
route.get(
  "/get-monthly-refunds",
  authorizeRoles("ADMIN"),
  getMonthlyRefundsData
);
route.get(
  "/get-monthly-subscriptions-data",
  authorizeRoles("ADMIN"),
  getMonthlySubscriptionsData
);

//Analytics & Reports

route.get(
  "/get-yearly-revenue-tax",
  authorizeRoles("ADMIN"),
  getYearly_Revenue_Tax_Data
);

route.get(
  "/get-monthly-hotels-data",
  authorizeRoles("ADMIN"),
  getMonthlyHotelsData
);

route.get(
  "/get-monthly-customer-data",
  authorizeRoles("ADMIN"),
  getMonthlyCustomerData
);

route.get(
  "/get-monthly-bookings-data",
  authorizeRoles("ADMIN"),
  getMonthlyBookingsData
);



export default route;
