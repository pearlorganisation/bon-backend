import express from "express";
import {
  updateProperty,
  createProperty,
  getPartnerProperties,
  getPartnerPropertyByID,
  addPropertyDetails,
  getAllProperties,
  changePropertyStatus,
  getPublicPropertyById,
  requestPropertyApproval,
  getPropertyApprovalRequests,
  approveRejectProperty,
} from "../../controllers/partner/property.controller.js";
import {
  createRooms,
  updateRoomById,
  updateRoomsInBulk,
  getRoomsByPropertyId,
  getTypesOfRoomsInProperty,
  deleteRoomsByTypes,
  deleteRoom,
  setRoomImagesAndVideosById,
  setRoomsImagesandVideosInBulk,
  getRoomDetailsById,

  
} from "../../controllers/partner/room.controller.js";
import {partner_KYC,verify_property_GSTIN, getPartnerKYC} from "../../controllers/partner/parnter.controller.js"
import { authorizeRoles, protect, optionalProtect } from "../../middleware/auth/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 5 },
]);



//---------- property routes ----------------

router.post(
  "/verify-pan",
  protect,
  authorizeRoles("PARTNER"),
  partner_KYC
);

router.post(
  "/verify-gstin",
  protect,
  authorizeRoles("PARTNER"),
  verify_property_GSTIN
);

router.get(
  "/verify-gstin",
  protect,
  authorizeRoles("PARTNER", "ADMIN"),
  
  getPartnerKYC
);






//---------- property routes ----------------

router.post("/create-property", protect, uploadFields, createProperty);
router.put(
  "/update-property/:propertyId",
  protect,
  uploadFields,
  updateProperty
);
router.get("/get-partner-properties", protect, getPartnerProperties);
router.get(
  "/get-partner-property/:propertyId",
  protect,
  getPartnerPropertyByID
);
router.get(
  "/get-property-by-id/:propertyId",
optionalProtect,
  getPublicPropertyById
);
router.get("/get-all-properties", getAllProperties);

router.put(
  "/add-property-details/:propertyId",
  protect,
  upload.fields([]),
  addPropertyDetails
);

router.put(
  "/change-property-status/:propertyId",
  protect,
  changePropertyStatus
);


router.patch(
  "/properties/:propertyId/request-approval",
  protect,
   authorizeRoles("PARTNER"),
  requestPropertyApproval
);








//------admin--------//


router.get(
  "/get-property-by-id/:propertyId",
optionalProtect,
  getPublicPropertyById
);


router.get(
  "/admin/properties/approval-requests",
  protect,
   authorizeRoles("ADMIN"),
  getPropertyApprovalRequests
);

router.patch(
  "/admin/properties/:propertyId/approve",
  protect,
   authorizeRoles("ADMIN"),
  approveRejectProperty
);


//---------- Rooms routes ----------------

router.post("/create-rooms/:propertyId", protect, uploadFields, createRooms);
router.put(
  "/update-single-room/:roomId",
  protect,
  uploadFields,
  updateRoomById
);
router.put("/update-rooms-bulk/:propertyId", protect, updateRoomsInBulk);
router.get(
  "/get-types-of-rooms/:propertyId",
  protect,
  getTypesOfRoomsInProperty
);
router.get(
  "/get-rooms-for-property/:propertyId",

  getRoomsByPropertyId
);
router.delete("/delete-rooms", protect, deleteRoomsByTypes);
router.delete("/delete-single-room/:roomId", protect, deleteRoom);
router.post(
  "/set-rooms-img-vid-inbulk/:propertyId",
  protect,
  uploadFields,
  setRoomsImagesandVideosInBulk
);
router.post(
  "/set-room-img-vid/:roomId",
  protect,
  uploadFields,
  setRoomImagesAndVideosById
);

router.get("/RoomDetails/:roomId", getRoomDetailsById);







export default router;
