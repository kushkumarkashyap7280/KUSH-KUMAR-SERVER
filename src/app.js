
import express from "express";
import cookieParser from "cookie-parser";
import serveStaticFiles from "../utils/staticFiles.js";
import cors from "cors";
import projectRoutes from "../routes/project.routes.js";
import experienceRoutes from "../routes/experience.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import postRoutes from "../routes/post.routes.js";
import contactRoutes from "../routes/contact.routes.js";
import path from "path";
import { fileURLToPath } from "url";
import apiError from "../utils/apiError.js";


const app = express();

// Trust the first proxy (e.g., Railway/Nginx) so req.secure and cookie "secure" behavior work correctly
app.set("trust proxy", 1);

// CORS with allowlist (supports multiple origins via comma-separated CORS_ORIGIN)
const allowlist = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser clients
    if (allowlist.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS not allowed for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({limit : "16mb"}));
app.use(express.urlencoded({extended: true, limit : "16mb"}));

serveStaticFiles(app);

app.use(cookieParser());

// Resolve project paths (from src/ → server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

app.get('/', (_req, res) => {
  res.sendFile(path.join(rootDir, "utils", "server.html"));
});
        
// API routes
app.use("/api/projects", projectRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/contacts", contactRoutes);

// 404 handler (JSON only)
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    data: null,
    message: "Not Found",
    success: false,
    errors: [
      {
        path: req.originalUrl,
        message: "Route not found",
        method: req.method,
      },
    ],
  });
});

// Centralized error handler (JSON only)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isKnown = err instanceof apiError;
  const statusCode = isKnown ? err.statusCode : err.status || 500;
  const message = isKnown ? err.message : err.message || "Internal Server Error";
  const errors = isKnown ? err.errors : [];
  const payload = {
    statusCode,
    data: null,
    message,
    success: false,
    errors,
  };
  // Ensure JSON content-type
  res.status(statusCode).json(payload);
});

export default app;
