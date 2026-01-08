import express from "express";
import { getPlatformSettings, updatePlatformSettings } from "../controllers/setting/PlatformSetting.controller.js";
import upload from "../middleware/multer.js";
import { authorizeRoles, protect } from "../middleware/auth/auth.middleware.js";

const router = express.Router();

router.get("/", getPlatformSettings);

router.post(
  "/update-plateform-setting",
  protect,
  authorizeRoles("ADMIN"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 }
  ]),
  updatePlatformSettings
);

export default router;