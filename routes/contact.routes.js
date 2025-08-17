import { Router } from "express";
import { createContact, listContacts, deleteContact } from "../controllers/Contact.controllers.js";
import requireAdmin from "../middlewares/auth.js";

const router = Router();

// Public endpoint to receive contact messages
router.post("/", createContact);

// Admin protected list (optional usage)
router.use(requireAdmin);
router.get("/", listContacts);
router.delete("/:id", deleteContact);

export default router;
