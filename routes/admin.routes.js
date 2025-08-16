import { Router } from "express";
import upload from "../middlewares/multer.js";

import { signup, login, logout, updateProfile, me, authStatus, publicResume } from "../controllers/Admin.controllers.js";
import requireAdmin from "../middlewares/auth.js";

const router = Router();

// Signup expects multipart/form-data with file field: 'avatar' (resume is a plain URL in body)
router.post(
  "/signup",
  upload.fields([
    { name: "avatar", maxCount: 1 },
  ]),
  signup
);

// JSON body: { email, password }
router.post("/login", login);

// Clears auth cookie
router.post("/logout", logout);

// Public auth status
router.get("/status", authStatus);

// Public resume url
router.get("/resume", publicResume);

// Update any fields; optionally replace avatar/resume via multipart
// Apply multer only if Content-Type is multipart/form-data
const maybeMultipart = (req, res, next) => {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    return upload.fields([
      { name: "avatar", maxCount: 1 },
    ])(req, res, next);
  }
  return next();
};

// Protected current user
router.get("/me", requireAdmin, me);

// Update profile
router.patch("/update", requireAdmin, maybeMultipart, updateProfile);

export default router;

