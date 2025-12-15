import express from "express";

import { getAllRooms } from "../controllers/partner/room.controller.js";

const router = express.Router();

router.get("/get-all-rooms", getAllRooms);

export default router;
