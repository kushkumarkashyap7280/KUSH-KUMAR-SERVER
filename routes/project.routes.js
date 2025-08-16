import { Router } from "express";
import { createProject, listProjects, listProjectsPublic, getProject, getProjectPublic, updateProject, deleteProject } from "../controllers/Project.controllers.js";
import requireAdmin from "../middlewares/auth.js";
import upload from "../middlewares/multer.js";

const router = Router();

// Public read-only route
router.get("/public", listProjectsPublic);
router.get("/public/:id", getProjectPublic);

// All routes below require a valid admin cookie (JWT)
router.use(requireAdmin);

// Conditionally parse multipart form-data for thumbnail/images
const maybeMultipart = (req, res, next) => {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    return upload.fields([
      { name: "thumbnail", maxCount: 1 },
      { name: "images", maxCount: 10 },
    ])(req, res, next);
  }
  return next();
};

router.get("/", listProjects);
router.post("/", maybeMultipart, createProject);
router.get("/:id", getProject);
router.patch("/:id", maybeMultipart, updateProject);
router.delete("/:id", deleteProject);

export default router;
