import jwt from "jsonwebtoken";
import apiError from "../utils/apiError.js";

const COOKIE_NAME = "token";

export default function requireAdmin(req, _res, next) {
  try {
    // Try to get token from multiple sources
    // 1. Check cookie first (preferred method)
    // 2. Check Authorization header (Bearer token)
    // 3. Check query parameter (for non-browser clients)
    let token = req.cookies?.[COOKIE_NAME];
    
    // If no cookie, try Authorization header (Bearer token)
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // If still no token, try query parameter (less secure, but useful for testing)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      throw new apiError(401, "Authentication required");
    }

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
