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
export const listContacts = asyncHandler(async (req, res) => {
  const { lastDays, since } = req.query || {};
  const filter = {};
  if (lastDays !== undefined) {
    const days = Number(lastDays);
    if (Number.isFinite(days) && days > 0) {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: from };
    }
  } else if (since) {
    const from = new Date(since);
    if (!isNaN(from.getTime())) {
      filter.createdAt = { $gte: from };
    }
  }
  const items = await Contact.find(filter, null, { sort: { createdAt: -1 } }).lean();
  return res.json(new apiRes(200, { items }));
});

// Admin: delete a contact by id
export const deleteContact = asyncHandler(async (req, res) => {
  const { id } = req.params || {};
  if (!id) throw new apiError(400, "id is required");
  const deleted = await Contact.findByIdAndDelete(id).lean();
  if (!deleted) throw new apiError(404, "Contact not found");
  return res.json(new apiRes(200, { id }, "Contact deleted"));
});
