
import express from "express"
import { protect } from "../../../middleware/auth/auth.middleware.js";
import { createSupportTicket, getAllSupportTickets } from "./supportTicket.contoller.js";

const routes = express.Router();


 
routes.post("/ticket-support",protect,createSupportTicket)
routes.get("/support-tickets",protect,getAllSupportTickets);




export default routes;
