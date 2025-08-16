import Contact from "../models/Contact.model.js";
import apiRes from "../utils/apiRes.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Public: create a contact message and notify via EmailJS
export const createContact = asyncHandler(async (req, res) => {
  const { name, email, topic, message, type, meta } = req.body || {};
  if (!email) throw new apiError(400, "email is required");

  // Basic email format check
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) throw new apiError(400, "invalid email format");

  const contact = await Contact.create({
    name: name || "",
    email,
    topic: topic || "",
    message: message || "",
    type: ["professional", "help", "other"].includes(type) ? type : "other",
    meta: meta || {},
  });

  // Notification sending removed by request; only store contact in DB and respond.

  return res.status(201).json(new apiRes(201, { contact }, "Received"));
});
// Optional: admin list (protected)
export const listContacts = asyncHandler(async (_req, res) => {
  const items = await Contact.find({}, null, { sort: { createdAt: -1 } }).lean();
  return res.json(new apiRes(200, { items }));
});
