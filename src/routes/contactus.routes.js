import express from "express";
import { createContact, getAllContacts } from "../controllers/contactus/contactus.controller.js";


const router = express.Router();

router.post("/submit-contact", createContact);
router.get("/get-all-contacts", getAllContacts);

export default router;
