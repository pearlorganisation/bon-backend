import express from "express";
import {
  createSupportCall,
  getAllSupportCalls,
  updateSupportCallStatus,
} from "./SupportCall.controller.js";
import { protect } from "../../../middleware/auth/auth.middleware.js";



const routes = express.Router();

routes.post("/call-support", protect, createSupportCall);
routes.get("/support-calls", protect, getAllSupportCalls);
routes.patch("/support-status-update/:id",protect,updateSupportCallStatus)


export default routes;
