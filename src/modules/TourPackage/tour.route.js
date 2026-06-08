import express from "express";
import multer from "multer";
import { createTrip ,getAllTrips , getTripBySlug , deleteTrip , updateTrip , handleTripEnquiry } from "./tour.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFields = upload.fields([
  {
    name: "gallery",
    maxCount: 12,
  },
   {
    name: "dayImages",
    maxCount: 100,
  },
]);

router.post("/create",  upload.any(), createTrip);
router.get("/get-all-tour",  getAllTrips);
router.get("/getTripBySlug/:slug", getTripBySlug);
router.put("/update/:id", upload.any(), updateTrip);
router.delete(
  "/delete/:id",
  deleteTrip
);
router.post("/enquire", handleTripEnquiry);

export default router;