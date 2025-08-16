import Experience from "../models/Experience.model.js";
import apiRes from "../utils/apiRes.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteLocal, deleteFromCloudinary } from "../utils/cloudinary.js";

export const createExperience = asyncHandler(async (req, res) => {
  const { role, company, startDate } = req.body || {};
  if (!role || !company || !startDate) throw new apiError(400, "role, company, startDate are required");

  const files = req.files || {};
  const imageFile = Array.isArray(files.image) && files.image[0] ? files.image[0] : null;
  const logoFile = Array.isArray(files.logo) && files.logo[0] ? files.logo[0] : null;

  const doc = { ...req.body };

  // Upload image
  if (imageFile?.path) {
    const { url, public_id } = await uploadToCloudinary(imageFile.path, "portfolio/experience/image");
    await deleteLocal(imageFile.path);
    doc.image = url;
    doc.imagePublicId = public_id;
  }

  // Upload logo
  if (logoFile?.path) {
    const { url, public_id } = await uploadToCloudinary(logoFile.path, "portfolio/experience/logo");
    await deleteLocal(logoFile.path);
    doc.logoPath = url;
    doc.logoPublicId = public_id;
  }

  const exp = await Experience.create(doc);
  return res.status(201).json(new apiRes(201, { experience: exp }, "Created"));
});

export const listExperiences = asyncHandler(async (_req, res) => {
  const items = await Experience.find().sort({ order: 1, startDate: -1 });
  return res.json(new apiRes(200, { items }));
});

// Public-facing list that maps to expCards shape expected by the frontend
export const listExperiencesPublic = asyncHandler(async (_req, res) => {
  const items = await Experience.find({ published: true }).sort({ order: 1, startDate: -1 });
  const fmt = (d) => {
    try {
      return new Date(d).toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch { return ""; }
  };
  const cards = items.map((e) => ({
    review: e.review || "",
    imgPath: e.image || "",
    logoPath: e.logoPath || e.image || "",
    title: e.role,
    date: e.current ? `${fmt(e.startDate)} - Present` : `${fmt(e.startDate)} - ${e.endDate ? fmt(e.endDate) : ""}`,
    responsibilities: Array.isArray(e.responsibilities) ? e.responsibilities : [],
    company: e.company || "",
    location: e.location || "",
    tags: Array.isArray(e.tags) ? e.tags : [],
  }));
  return res.json(new apiRes(200, { items: cards }));
});

export const getExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exp = await Experience.findById(id);
  if (!exp) throw new apiError(404, "Experience not found");
  return res.json(new apiRes(200, { experience: exp }));
});

// Public: get a single published experience by id
export const getExperiencePublic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exp = await Experience.findOne({ _id: id, published: true });
  if (!exp) throw new apiError(404, "Experience not found");
  return res.json(new apiRes(200, { experience: exp }));
});

export const updateExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const current = await Experience.findById(id);
  if (!current) throw new apiError(404, "Experience not found");

  const files = req.files || {};
  const imageFile = Array.isArray(files.image) && files.image[0] ? files.image[0] : null;
  const logoFile = Array.isArray(files.logo) && files.logo[0] ? files.logo[0] : null;

  const updates = { ...req.body };

  if (imageFile?.path) {
    const { url, public_id } = await uploadToCloudinary(imageFile.path, "portfolio/experience/image");
    await deleteLocal(imageFile.path);
    updates.image = url;
    updates.imagePublicId = public_id;
    if (current.imagePublicId) await deleteFromCloudinary(current.imagePublicId);
  }

  if (logoFile?.path) {
    const { url, public_id } = await uploadToCloudinary(logoFile.path, "portfolio/experience/logo");
    await deleteLocal(logoFile.path);
    updates.logoPath = url;
    updates.logoPublicId = public_id;
    if (current.logoPublicId) await deleteFromCloudinary(current.logoPublicId);
  }

  const exp = await Experience.findByIdAndUpdate(id, updates, { new: true });
  return res.json(new apiRes(200, { experience: exp }, "Updated"));
});

export const deleteExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exp = await Experience.findByIdAndDelete(id);
  if (!exp) throw new apiError(404, "Experience not found");
  return res.json(new apiRes(200, null, "Deleted"));
});
