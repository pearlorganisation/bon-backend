
import express from "express";
import { updateProperty, createProperty, getPartnerProperties, getPartnerPropertyByID } from "../../controllers/partner/property.controller.js"
import {
  createRooms,
  updateRoomById,
  updateRoomsInBulk
} from "../../controllers/partner/room.controller.js";
import { protect } from "../../middleware/auth/auth.middleware.js";
import multer from "multer";

const  router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "images", maxCount: 5 },
  { name: "videos", maxCount: 2 },
]);


router.post("/create-property", protect, uploadFields, createProperty);
router.put("/update-property/:propertyId", protect, uploadFields, updateProperty);
router.get("/get-partner-properties", protect, getPartnerProperties);
router.get("/get-partner-property/:propertyId", protect, getPartnerPropertyByID);

//---------- Rooms routes ----------------


router.post("/create-room/:propertyId", protect,createRooms);
router.post("/update-single-room/:roomId", protect,updateRoomById);
router.put("/update-rooms-bulk/:propertyId", protect,updateRoomsInBulk);


export default router;