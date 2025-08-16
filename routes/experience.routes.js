import { Router } from "express";
import { createExperience, listExperiences, listExperiencesPublic, getExperience, getExperiencePublic, updateExperience, deleteExperience } from "../controllers/Experience.controllers.js";
import requireAdmin from "../middlewares/auth.js";
import upload from "../middlewares/multer.js";

const router = Router();

// Public endpoint for frontend consumption (no auth)
router.get("/public", listExperiencesPublic);
router.get("/public/:id", getExperiencePublic);

// All routes below require a valid admin cookie (JWT)
router.use(requireAdmin);

// Conditionally parse multipart form-data for image/logo
const maybeMultipart = (req, res, next) => {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    return upload.fields([
      { name: "image", maxCount: 1 },
      { name: "logo", maxCount: 1 },
    ])(req, res, next);
  }
  return next();
};

router.get("/", listExperiences);
router.post("/", maybeMultipart, createExperience);
router.get("/:id", getExperience);
router.patch("/:id", maybeMultipart, updateExperience);
router.delete("/:id", deleteExperience);

export default router;
