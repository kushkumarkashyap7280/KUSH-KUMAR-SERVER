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
  const origin = (process.env.CORS_ORIGIN || "").split(",")[0]?.trim() || "";
  const looksHttps = /^https:\/\//i.test(origin);

  // Allow explicit overrides
  const envSameSite = (process.env.COOKIE_SAMESITE || "").toLowerCase(); // "none" | "lax" | "strict"
  const envSecure = process.env.COOKIE_SECURE;
  const envMaxAge = Number(process.env.COOKIE_MAX_AGE_MS || 0);

  // For cross-origin requests (different domains), use SameSite=None with Secure
  // Force SameSite=None for cross-domain cookie sharing
  const sameSiteDefault = "none";
  // For SameSite=None, cookies MUST be Secure
  const secureDefault = true;

  const sameSite = ["none","lax","strict"].includes(envSameSite) ? envSameSite : sameSiteDefault;
  const secure = typeof envSecure !== "undefined" ? String(envSecure).toLowerCase() === "true" : secureDefault;
  // Default: 1 hour session cookie unless overridden via env
  const maxAge = envMaxAge > 0 ? envMaxAge : 60 * 60 * 1000; // 1 hour

  // For debugging
  console.log("Cookie options:", { sameSite, secure, httpOnly: true, maxAge, path: "/" });

  return {
    httpOnly: true,
    sameSite,
    secure,
    maxAge,
    path: "/",
    // Domain is optional and typically not needed
    // If set, should be the root domain (e.g., .example.com)
    // domain: process.env.COOKIE_DOMAIN || undefined,
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
    .json(new apiRes(201, { token }, "Signup successful"));
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
      token
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
        description: admin.description,
        avatar: admin.avatar,
        resume: admin.resumeUrl,
        // return full qualification array for admin UI (unfiltered)
        qualification: Array.isArray(admin.qualification)
          ? admin.qualification.map((q) => ({
              _id: q._id,
              instituteLink: q.instituteLink,
              mediaUrl: q.mediaUrl,
              mediaType: q.mediaType,
              title: q.title,
              desc: q.desc,
              skills: Array.isArray(q.skills) ? q.skills : [],
              from: q.from,
              to: q.to,
              isPublished: q.isPublished,
            }))
          : [],
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
    .select("_id Fname Lname email description avatar resumeUrl qualification")
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
        description: admin.description || "",
        avatar: admin.avatar,
        resume: admin.resumeUrl,
        qualification: Array.isArray(admin.qualification)
          ? admin.qualification
              .filter((q) => q && q.isPublished)
              .map((q) => ({
                instituteLink: q.instituteLink,
                mediaUrl: q.mediaUrl,
                mediaType: q.mediaType,
                title: q.title,
                desc: q.desc,
                skills: Array.isArray(q.skills) ? q.skills : [],
                from: q.from,
                to: q.to,
                isPublished: q.isPublished,
              }))
          : [],
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
  if (typeof req.body?.description === "string") updates.description = req.body.description;

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

  // Allow updating qualifications (array) via JSON body or multipart (stringified JSON)
  if (typeof req.body?.qualification !== "undefined") {
    let qual = req.body.qualification;
    if (typeof qual === "string") {
      try {
        qual = JSON.parse(qual);
      } catch (_e) {
        throw new apiError(400, "Invalid qualification payload: must be valid JSON");
      }
    }
    if (!Array.isArray(qual)) {
      throw new apiError(400, "qualification must be an array");
    }
    // Basic sanitation: ensure objects and coerce empty strings to undefined for optional fields
    updates.qualification = qual.map((q) => ({
      instituteLink: typeof q?.instituteLink === "string" ? q.instituteLink : "",
      mediaUrl: typeof q?.mediaUrl === "string" && q.mediaUrl.trim() ? q.mediaUrl.trim() : undefined,
      mediaType: typeof q?.mediaType === "string" ? q.mediaType : undefined,
      title: typeof q?.title === "string" ? q.title : "",
      desc: typeof q?.desc === "string" && q.desc.trim() ? q.desc.trim() : undefined,
      skills: Array.isArray(q?.skills) ? q.skills.filter((s) => typeof s === "string" && s.trim()) : [],
      from: q?.from || undefined,
      to: q?.to || undefined,
      isPublished: typeof q?.isPublished === "boolean" ? q.isPublished : false,
    }));
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
        description: updated.description,
        avatar: updated.avatar,
        resume: updated.resumeUrl,
        qualification: Array.isArray(updated.qualification)
          ? updated.qualification.map((q) => ({
              _id: q._id,
              instituteLink: q.instituteLink,
              mediaUrl: q.mediaUrl,
              mediaType: q.mediaType,
              title: q.title,
              desc: q.desc,
              skills: Array.isArray(q.skills) ? q.skills : [],
              from: q.from,
              to: q.to,
              isPublished: q.isPublished,
            }))
          : [],
      },
    }, "Profile updated")
  );
});