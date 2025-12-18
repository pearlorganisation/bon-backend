
import express from "express"
import { protect } from "../../../middleware/auth/auth.middleware.js";
import { createSupportTicket, getAllSupportTickets, updateSupportTicketStatus } from "./supportTicket.contoller.js";

const routes = express.Router();


routes.post("/ticket-support",protect,createSupportTicket)
routes.get("/support-tickets",protect,getAllSupportTickets);
routes.patch("/support-status-update/:ticketId",protect,updateSupportTicketStatus)


export default routes;
