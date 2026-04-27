import express from "express";
import {
  updateProperty,
  createProperty,
  getPartnerProperties,
  getPartnerPropertyByID,
  getAllProperties,
  changePropertyStatus,
  requestPropertyApproval,
  getAllPropertyTypes,
  getPropertyTypeWithProperties,
} from "../../controllers/partner/property.controller.js";
import {
  createRooms,
  updateRoomById,
  updateRoomsInBulk,
  getRoomsByPropertyId,
  getTypesOfRoomsInProperty,
  deleteRoomsByTypes,
  deleteRoom,
  getRoomDetailsById,
} from "../../controllers/partner/room.controller.js";
import {
  partner_KYC,
  verify_property_GSTIN,
  getPartnerKYC,
  createPartnerFundAccount,
  buyNewCommissionPlan,
  buyNewSubscriptionPlan,
  getMyPlans,
  blockRoom,
  releaseBlock,
  getPartnerRoomCalendar,
  getPartnerMonthlyFinance,
  getPartnerYearlyAnalysis,
  getPartnerMonthlyBookingsData,
  getMyMonthlyPayout,
  getRecentBookingByID,
  getPlanById,
} from "../../controllers/partner/parnter.controller.js";
import {
  authorizeRoles,
  protect,
  optionalProtect,
} from "../../middleware/auth/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 5 },
  { name: "propertyDocument", maxCount: 1 },
]);

//---------- parnter routes ----------------

router.post("/verify-pan", protect, authorizeRoles("PARTNER"), partner_KYC);

router.post(
  "/verify-gstin",
  protect,
  authorizeRoles("PARTNER"),
  verify_property_GSTIN,
);

router.get(
  "/verify-gstin",
  protect,
  authorizeRoles("PARTNER", "ADMIN"),
  getPartnerKYC,
);

router.post(
  "/update--partner-bank-account",
  protect,
  authorizeRoles("PARTNER"),
  updatePartnerBankAccount
);

router.post(
  "/buy-commision-plan",
  protect,
  authorizeRoles("PARTNER"),
  buyNewCommissionPlan,
);
router.post(
  "/buy-subscription-plan/:subscriptionPlanId",
  protect,
  authorizeRoles("PARTNER"),
  buyNewSubscriptionPlan,
);
router.get(
  "/my-plans",
  protect,
  authorizeRoles("PARTNER", "ADMIN"),
  getMyPlans,
);
router.get(
  "/get-plan/:planId",
  protect,
  authorizeRoles("PARTNER", "ADMIN"),
  getPlanById
);

//---------- property routes ----------------

router.post("/create-property", protect, uploadFields, createProperty);
router.put(
  "/update-property/:propertyId",
  protect,
  uploadFields,
  updateProperty,
);
router.get("/get-partner-properties", protect, getPartnerProperties);
router.get(
  "/get-partner-property/:propertyId",
  protect,
  getPartnerPropertyByID,
);
router.get("/get-all-properties", getAllProperties);

router.get("/types", getAllPropertyTypes);

router.get("/types/:type", getPropertyTypeWithProperties);

router.put(
  "/change-property-status/:propertyId",
  protect,
  changePropertyStatus,
);

router.patch(
  "/properties/:propertyId/request-approval",
  protect,
  authorizeRoles("PARTNER", "SUB_ADMIN"),
  requestPropertyApproval,
);

//---------- Rooms routes ----------------

router.post("/create-rooms/:propertyId", protect, uploadFields, createRooms);
router.put(
  "/update-single-room/:roomId",
  protect,
  uploadFields,
  updateRoomById,
);
router.put("/update-rooms-bulk/:propertyId", protect, updateRoomsInBulk);
router.get(
  "/get-types-of-rooms/:propertyId",
  protect,
  getTypesOfRoomsInProperty,
);
router.get(
  "/get-rooms-for-property/:propertyId",

  getRoomsByPropertyId,
);
router.delete("/delete-rooms", protect, deleteRoomsByTypes);
router.delete("/delete-single-room/:roomId", protect, deleteRoom);

router.get("/RoomDetails/:roomId", getRoomDetailsById);

// manually block room

router.post("/block-room", protect, blockRoom);
router.post("/release-block/:id", protect, releaseBlock);
router.get("/room-calendar", protect, getPartnerRoomCalendar);

//partner dashboard api

router.get(
  "/get-my-monthly-finance",
  protect,
  authorizeRoles("PARTNER"),
  getPartnerMonthlyFinance,
);

router.get(
  "/get-yearly-analysis",
  protect,
  authorizeRoles("PARTNER"),
  getPartnerYearlyAnalysis,
);
router.get(
  "/get-recent-booking/:propertyId",
  protect,
  authorizeRoles("PARTNER"),
  getRecentBookingByID,
);

router.get(
  "/get-property-montlhy-booking-data",
  protect,
  authorizeRoles("PARTNER"),
  getPartnerMonthlyBookingsData,
);
router.get(
  "/get-my-montlhy-payouts",
  protect,
  authorizeRoles("PARTNER"),
  getMyMonthlyPayout,
);

export default router;
