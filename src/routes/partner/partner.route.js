
import express from "express";
import {updateProperty,createProperty,getPartnerProperties,getPartnerPropertyByID} from "../../controllers/partner/partner.controller.js"
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

export default router;