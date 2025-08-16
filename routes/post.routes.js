import { Router } from "express";
import { createPost, listPosts, listPostsPublic, getPost, getPostPublic, updatePost, deletePost } from "../controllers/Post.controllers.js";
import requireAdmin from "../middlewares/auth.js";
import upload from "../middlewares/multer.js";

const router = Router();

// Public
router.get("/public", listPostsPublic);
router.get("/public/:id", getPostPublic);

// Protected
router.use(requireAdmin);

// Conditionally parse multipart only when needed
const maybeMultipart = (req, res, next) => {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    return upload.fields([{ name: "image", maxCount: 1 }])(req, res, next);
  }
  return next();
};

router.get("/", listPosts);
router.post("/", maybeMultipart, createPost);
router.get("/:id", getPost);
router.patch("/:id", maybeMultipart, updatePost);
router.delete("/:id", deletePost);

export default router;
