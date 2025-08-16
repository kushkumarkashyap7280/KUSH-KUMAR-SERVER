import Post from "../models/Post.model.js";
import apiRes from "../utils/apiRes.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary, deleteLocal } from "../utils/cloudinary.js";

const parseToArray = (val) => {
  if (val === undefined || val === null) return undefined;
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

export const createPost = asyncHandler(async (req, res) => {
  const { platform, title, link, excerpt, published, order } = req.body || {};
  if (!platform || !title || !link) throw new apiError(400, "platform, title and link are required");

  let tags = parseToArray(req.body?.tags) || [];

  // File upload: image (optional)
  let image = "";
  let imagePublicId = "";
  const file = req?.files?.image?.[0] || req?.file; // support single or fields
  if (file?.path) {
    const up = await uploadToCloudinary(file.path, "portfolio/posts/image");
    if (!up?.url) throw new apiError(500, "Image upload failed");
    image = up.url;
    imagePublicId = up.public_id || "";
    deleteLocal(file.path);
  }

  const post = await Post.create({
    platform,
    title,
    link,
    excerpt: excerpt || "",
    tags,
    image,
    imagePublicId,
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    published: published !== undefined ? String(published) === "true" || published === true : true,
  });
  // Enforce only 10 latest posts (by createdAt). Delete older ones and their images.
  try {
    const extras = await Post.find({}, { _id: 1, imagePublicId: 1 })
      .sort({ createdAt: -1 })
      .skip(10)
      .lean();
    if (extras && extras.length) {
      // Delete images in parallel
      await Promise.all(
        extras.map((p) => (p.imagePublicId ? deleteFromCloudinary(p.imagePublicId) : Promise.resolve()))
      );
      await Post.deleteMany({ _id: { $in: extras.map((p) => p._id) } });
    }
  } catch (e) {
    // Log but do not fail the creation response
    console.error("post cleanup error:", e?.message || e);
  }
  return res.status(201).json(new apiRes(201, { post }, "Created"));
});

export const listPosts = asyncHandler(async (_req, res) => {
  const items = await Post.find().sort({ order: 1, createdAt: -1 }).lean();
  return res.json(new apiRes(200, { items }));
});

export const listPostsPublic = asyncHandler(async (_req, res) => {
  const items = await Post.find(
    { published: true },
    { platform: 1, title: 1, link: 1, tags: 1, image: 1, excerpt: 1, createdAt: 1 }
  )
    .sort({ order: 1, createdAt: -1 })
    .lean();
  return res.json(new apiRes(200, { items }));
});

export const getPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post) throw new apiError(404, "Post not found");
  return res.json(new apiRes(200, { post }));
});

// Public: get a single published post by id
export const getPostPublic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await Post.findOne(
    { _id: id, published: true },
    { platform: 1, title: 1, link: 1, tags: 1, image: 1, excerpt: 1, createdAt: 1 }
  );
  if (!post) throw new apiError(404, "Post not found");
  return res.json(new apiRes(200, { post }));
});

export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const current = await Post.findById(id);
  if (!current) throw new apiError(404, "Post not found");

  const update = { ...req.body };
  const tags = parseToArray(req.body?.tags);
  if (tags !== undefined) update.tags = tags;
  if (update.order !== undefined) update.order = Number(update.order);
  if (update.published !== undefined) update.published = String(update.published) === "true" || update.published === true;

  // Replace image if provided
  const file = req?.files?.image?.[0] || req?.file;
  if (file?.path) {
    const up = await uploadToCloudinary(file.path, "portfolio/posts/image");
    if (!up?.url) throw new apiError(500, "Image upload failed");
    update.image = up.url;
    update.imagePublicId = up.public_id || "";
    deleteLocal(file.path);
    if (current.imagePublicId) {
      await deleteFromCloudinary(current.imagePublicId);
    }
  }

  const updated = await Post.findByIdAndUpdate(id, update, { new: true });
  return res.json(new apiRes(200, { post: updated }, "Updated"));
});

export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await Post.findByIdAndDelete(id);
  if (!post) throw new apiError(404, "Post not found");
  if (post.imagePublicId) {
    await deleteFromCloudinary(post.imagePublicId);
  }
  return res.json(new apiRes(200, null, "Deleted"));
});
