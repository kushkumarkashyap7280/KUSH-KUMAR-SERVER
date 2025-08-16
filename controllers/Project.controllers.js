import Project from "../models/Project.model.js";
import apiRes from "../utils/apiRes.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary, deleteLocal } from "../utils/cloudinary.js";

export const createProject = asyncHandler(async (req, res) => {
  const body = req.body || {};
  let { title, slug, description, techStack, features, outcome, repoUrl, demoUrl, featured, status, order, published } = body;
  if (!title || !slug) throw new apiError(400, "title and slug are required");

  const exists = await Project.findOne({ slug });
  if (exists) throw new apiError(409, "slug already exists");

  // Normalize arrays possibly sent as JSON strings
  const parseToArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return String(val)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  };
  techStack = parseToArray(techStack || body.tags); // allow alias 'tags'
  features = parseToArray(features);

  // Handle files: thumbnail (single) and images (multiple)
  const files = req.files || {};
  let thumbnail = "";
  let thumbnailPublicId = "";
  let images = [];
  let imagesPublicIds = [];

  if (files.thumbnail?.[0]?.path) {
    const up = await uploadToCloudinary(files.thumbnail[0].path, "portfolio/project/thumbnail");
    if (!up?.url) throw new apiError(500, "Thumbnail upload failed");
    thumbnail = up.url;
    thumbnailPublicId = up.public_id || "";
    deleteLocal(files.thumbnail[0].path);
  }

  if (Array.isArray(files.images) && files.images.length) {
    for (const f of files.images) {
      const up = await uploadToCloudinary(f.path, "portfolio/project/images");
      if (up?.url) {
        images.push(up.url);
        imagesPublicIds.push(up.public_id || "");
      }
      deleteLocal(f.path);
    }
  }

  const project = await Project.create({
    title,
    slug,
    description: description || "",
    techStack,
    features,
    outcome: outcome || "",
    repoUrl: repoUrl || "",
    demoUrl: demoUrl || "",
    images,
    imagesPublicIds,
    thumbnail,
    thumbnailPublicId,
    featured: Boolean(featured),
    status: status || "planned",
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    published: published !== undefined ? String(published) === "true" || published === true : true,
  });
  return res.status(201).json(new apiRes(201, { project }, "Created"));
});

export const listProjects = asyncHandler(async (_req, res) => {
  const items = await Project.find().sort({ order: 1, createdAt: -1 });
  return res.json(new apiRes(200, { items }));
});

export const listProjectsPublic = asyncHandler(async (_req, res) => {
  const items = await Project.find({ published: true }).sort({ order: 1, createdAt: -1 });
  return res.json(new apiRes(200, { items }));
});

export const getProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) throw new apiError(404, "Project not found");
  return res.json(new apiRes(200, { project }));
});

// Public: get a single published project by id
export const getProjectPublic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOne({ _id: id, published: true });
  if (!project) throw new apiError(404, "Project not found");
  return res.json(new apiRes(200, { project }));
});

export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const current = await Project.findById(id);
  if (!current) throw new apiError(404, "Project not found");

  const body = req.body || {};
  const parseToArray = (val) => {
    if (val === undefined) return undefined;
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      const arr = String(val)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return arr.length ? arr : undefined;
    }
  };

  const update = { ...body };
  const techStack = parseToArray(body.techStack || body.tags);
  if (techStack !== undefined) update.techStack = techStack;
  const features = parseToArray(body.features);
  if (features !== undefined) update.features = features;

  if (update.order !== undefined) update.order = Number(update.order);
  if (update.published !== undefined) update.published = String(update.published) === "true" || update.published === true;

  // Files
  const files = req.files || {};
  // Thumbnail replacement
  if (files.thumbnail?.[0]?.path) {
    const up = await uploadToCloudinary(files.thumbnail[0].path, "portfolio/project/thumbnail");
    if (!up?.url) throw new apiError(500, "Thumbnail upload failed");
    update.thumbnail = up.url;
    update.thumbnailPublicId = up.public_id || "";
    deleteLocal(files.thumbnail[0].path);
    if (current.thumbnailPublicId) {
      await deleteFromCloudinary(current.thumbnailPublicId);
    }
  }

  // Images replacement (if provided, replace all)
  if (Array.isArray(files.images) && files.images.length) {
    const newImages = [];
    const newPublicIds = [];
    for (const f of files.images) {
      const up = await uploadToCloudinary(f.path, "portfolio/project/images");
      if (up?.url) {
        newImages.push(up.url);
        newPublicIds.push(up.public_id || "");
      }
      deleteLocal(f.path);
    }
    update.images = newImages;
    update.imagesPublicIds = newPublicIds;
    // delete old ones
    if (Array.isArray(current.imagesPublicIds)) {
      for (const pid of current.imagesPublicIds) {
        if (pid) await deleteFromCloudinary(pid);
      }
    }
  }

  const updated = await Project.findByIdAndUpdate(id, update, { new: true });
  return res.json(new apiRes(200, { project: updated }, "Updated"));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await Project.findByIdAndDelete(id);
  if (!project) throw new apiError(404, "Project not found");
  // Clean up Cloudinary assets
  if (project.thumbnailPublicId) {
    await deleteFromCloudinary(project.thumbnailPublicId);
  }
  if (Array.isArray(project.imagesPublicIds)) {
    for (const pid of project.imagesPublicIds) {
      if (pid) await deleteFromCloudinary(pid);
    }
  }
  return res.json(new apiRes(200, null, "Deleted"));
});
