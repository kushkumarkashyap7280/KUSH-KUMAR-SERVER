// day_007 ---------------------------------------------------------
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go from utils/ → project root
const rootDir = path.join(__dirname, "../");

// Serve static upload folders
export default function serveStaticFiles(app) {
  app.use("/uploads/images", express.static(path.join(rootDir, "uploads/images")));
  app.use("/uploads/files", express.static(path.join(rootDir, "uploads/files")));
  app.use("/uploads/media", express.static(path.join(rootDir, "uploads/media")));
}
//  ---------------------------------------------------------