import jwt from "jsonwebtoken";
import apiError from "../utils/apiError.js";

const COOKIE_NAME = "token";

export default function requireAdmin(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) throw new apiError(401, "Authentication required");

    const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
    const payload = jwt.verify(token, JWT_SECRET);

    // optionally attach admin id to req
    req.admin = { id: payload.id };
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new apiError(401, "Invalid or expired token"));
    }
    next(err);
  }
}
