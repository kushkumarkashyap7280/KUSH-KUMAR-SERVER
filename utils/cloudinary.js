import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

export async function uploadToCloudinary(localPath, folder = "portfolio", options = {}) {
  const {
    resource_type = "auto",
    type = "upload",
    access_mode = "public",
    use_filename = false,
    unique_filename = true,
    overwrite = true,
  } = options || {};

  const res = await cloudinary.uploader.upload(localPath, {
    resource_type,
    folder,
    type,
    access_mode,
    use_filename,
    unique_filename,
    overwrite,
  });
  return { url: res.secure_url, public_id: res.public_id };
}

export async function deleteLocal(localPath) {
  try { await fs.unlink(localPath); } catch { /* ignore */ }
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  const types = ["image", "raw", "video"];
  for (const t of types) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: t });
      return;
    } catch {
      // try next type
    }
  }
}