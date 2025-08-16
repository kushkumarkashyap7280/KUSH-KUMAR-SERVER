// server/controllers/Admin.controllers.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model.js";
import apiRes from "../utils/apiRes.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteLocal, deleteFromCloudinary } from "../utils/cloudinary.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_NAME = "token";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
//node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const BCRYPT_PEPPER = process.env.BCRYPT_PEPPER || "";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// GET /api/admin/resume (public): returns { resume: string } for configured admin
export const publicResume = asyncHandler(async (_req, res) => {
  const envEmail = (
    process.env.PUBLIC_ADMIN_EMAIL ||
    process.env.ADMIN_PUBLIC_EMAIL ||
    process.env.ADMIN_EMAIL ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  if (!envEmail) {
    throw new apiError(500, "PUBLIC_ADMIN_EMAIL (or ADMIN_PUBLIC_EMAIL/ADMIN_EMAIL) is not set");
  }

  const admin = await Admin.findOne({ email: envEmail })
    .select("resumeUrl")
    .lean();

  if (!admin || !admin.resumeUrl) {
    throw new apiError(404, "Resume not found for configured admin");
  }

  return res.json(new apiRes(200, { resume: admin.resumeUrl }, "Public resume url"));
});

// GET /api/admin/resume/download (public): redirects to Cloudinary attachment URL (forces download)
// (Removed) publicResumeDownload: no longer needed when resume is a provided URL

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    // 7 days (align with JWT_EXPIRES_IN default)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// POST /api/admin/signup
export const signup = asyncHandler(async (req, res) => {
  const { Fname, Lname, email, password } = req.body || {};

  if (!Fname || !email || !password) {
    throw new apiError(400, "Fname, email and password are required");
  }

  const existing = await Admin.findOne({ email: (email || "").toLowerCase() });
  if (existing) {
    throw new apiError(409, "Email already in use");
  }

  // Handle uploaded files from multer.fields: avatar and resume
  // Fallback to body fields if provided (not recommended)
  const files = req.files || {};
  let avatarUrl = req.body?.avatar || "";
  let resumeUrl = req.body?.resumeUrl || "";

  // Upload avatar if file present
  const avatarFile = Array.isArray(files.avatar) && files.avatar[0] ? files.avatar[0] : null;
  let avatarPublicId = "";
  if (avatarFile?.path) {
    const { url, public_id } = await uploadToCloudinary(avatarFile.path, "portfolio/admin/avatar");
    await deleteLocal(avatarFile.path);
    avatarUrl = url;
    avatarPublicId = public_id;
  }

  // Resume now expected as a direct URL from the client (no upload)

  if (!avatarUrl) {
    throw new apiError(400, "avatar image is required (send as multipart/form-data field 'avatar')");
  }
  if (!resumeUrl) {
    throw new apiError(400, "resume URL is required (send as body field 'resume' or 'resumeUrl')");
  }

  const hashed = await bcrypt.hash((password || "") + BCRYPT_PEPPER, BCRYPT_ROUNDS);
  const admin = await Admin.create({
    Fname,
    Lname: Lname || "",
    email: email.toLowerCase(),
    password: hashed,
    avatar: avatarUrl,
    avatarPublicId: avatarPublicId || undefined,
    resumeUrl,
  });
  const token = signToken({ id: admin._id });
  return res
    .status(201)
    .cookie(COOKIE_NAME, token, cookieOptions())
    .json(new apiRes(201, null, "Signup successful"));
});

// POST /api/admin/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw new apiError(400, "Email and password are required");
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) {
    throw new apiError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare((password || "") + BCRYPT_PEPPER, admin.password);
  if (!ok) {
    throw new apiError(401, "Invalid credentials");
  }

  const token = signToken({ id: admin._id });
  return res
    .status(200)
    .cookie(COOKIE_NAME, token, cookieOptions())
    .json(new apiRes(200, {
      admin: {
        id: admin._id,
        Fname: admin.Fname,
        Lname: admin.Lname,
        email: admin.email,
        avatar: admin.avatar,
        resume : admin.resumeUrl
      },
    }, "Login successful"));
});

// POST /api/admin/logout
export const logout = asyncHandler(async (_req, res) => {
  return res
    .status(200)
    .clearCookie(COOKIE_NAME, {
      ...cookieOptions(),
      maxAge: 0,
    })
    .json(new apiRes(200, null, "Logged out"));
});

// GET /api/admin/me (protected)
export const me = asyncHandler(async (req, res) => {
  const adminId = req.admin?.id;
  if (!adminId) throw new apiError(401, "Authentication required");
  const admin = await Admin.findById(adminId);
  if (!admin) throw new apiError(404, "Admin not found");
  return res.status(200).json(
    new apiRes(200, {
      admin: {
        id: admin._id,
        Fname: admin.Fname,
        Lname: admin.Lname,
        email: admin.email,
        avatar: admin.avatar,
        resume: admin.resumeUrl,
      },
    })
  );
});

// GET /api/admin/status (public): returns configured admin's public profile by email from env
// Environment variables supported (checked in order): PUBLIC_ADMIN_EMAIL, ADMIN_PUBLIC_EMAIL, ADMIN_EMAIL
export const authStatus = asyncHandler(async (_req, res) => {
  const envEmail = (
    process.env.PUBLIC_ADMIN_EMAIL ||
    process.env.ADMIN_PUBLIC_EMAIL ||
    process.env.ADMIN_EMAIL ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  if (!envEmail) {
    // Misconfiguration: no email specified
    throw new apiError(500, "PUBLIC_ADMIN_EMAIL (or ADMIN_PUBLIC_EMAIL/ADMIN_EMAIL) is not set");
  }

  const admin = await Admin.findOne({ email: envEmail })
    .select("_id Fname Lname email avatar resumeUrl")
    .lean();

  if (!admin) {
    throw new apiError(404, "Configured admin not found");
  }

  return res.json(
    new apiRes(200, {
      admin: {
        Fname: admin.Fname,
        Lname: admin.Lname,
        email: admin.email,
        avatar: admin.avatar,
        resume: admin.resumeUrl,
      },
    }, "Public admin profile")
  );
});
// PATCH /api/admin/update
export const updateProfile = asyncHandler(async (req, res) => {
  const adminId = req.admin?.id;
  if (!adminId) throw new apiError(401, "Authentication required");

  const { Fname, Lname, email, password } = req.body || {};

  // Load current admin to know old Cloudinary public_ids for safe deletion
  const current = await Admin.findById(adminId);
  if (!current) throw new apiError(404, "Admin not found");

  const updates = {};
  if (typeof Fname === "string" && Fname.trim()) updates.Fname = Fname.trim();
  if (typeof Lname === "string") updates.Lname = Lname;
  if (typeof email === "string" && email.trim()) updates.email = email.toLowerCase().trim();

  if (typeof password === "string" && password.length) {
    updates.password = await bcrypt.hash(password + BCRYPT_PEPPER, BCRYPT_ROUNDS);
  }

  // Files: avatar/resume via multer.fields
  const files = req.files || {};
  const avatarFile = Array.isArray(files.avatar) && files.avatar[0] ? files.avatar[0] : null;
  if (avatarFile?.path) {
    const { url, public_id } = await uploadToCloudinary(avatarFile.path, "portfolio/admin/avatar");
    await deleteLocal(avatarFile.path);
    updates.avatar = url;
    updates.avatarPublicId = public_id;
    // delete old avatar from Cloudinary (after successful new upload)
    if (current.avatarPublicId) await deleteFromCloudinary(current.avatarPublicId);
  }

  // Allow updating resume URL directly via body
  if (typeof req.body?.resume === "string" && req.body.resume.trim()) {
    updates.resumeUrl = req.body.resume.trim();
  } else if (typeof req.body?.resumeUrl === "string" && req.body.resumeUrl.trim()) {
    updates.resumeUrl = req.body.resumeUrl.trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(200).json(new apiRes(200, null, "No changes"));
  }

  // Optional: prevent email duplication
  if (updates.email) {
    const existing = await Admin.findOne({ email: updates.email, _id: { $ne: adminId } });
    if (existing) throw new apiError(409, "Email already in use");
  }

  const updated = await Admin.findByIdAndUpdate(adminId, updates, { new: true });
  if (!updated) throw new apiError(404, "Admin not found");

  return res.status(200).json(
    new apiRes(200, {
      admin: {
        id: updated._id,
        Fname: updated.Fname,
        Lname: updated.Lname,
        email: updated.email,
        avatar: updated.avatar,
        resume: updated.resumeUrl,
      },
    }, "Profile updated")
  );
});