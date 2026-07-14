// Reusable API authentication and role authorization helpers.
import { connectDB } from "./db";
import { verifyAccessToken } from "./jwt";
import User from "./models/User.js";
import { toObjectId } from "./mongo";

export function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

export async function authenticateRequest(req, allowedRoles = []) {
  const token = getBearerToken(req);
  if (!token) {
    return { error: { status: 401, message: "Access token required" } };
  }

  try {
    const user = verifyAccessToken(token);
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return { error: { status: 403, message: "Forbidden for this role" } };
    }

    await connectDB();
    const objectId = toObjectId(user.id);
    if (!objectId) {
      return { error: { status: 401, message: "Invalid user id in token" } };
    }

    const dbUser = await User.findById(objectId).select("token_version role").lean();
    if (!dbUser) {
      return { error: { status: 401, message: "User no longer exists" } };
    }

    if (dbUser.role !== user.role) {
      return { error: { status: 401, message: "Role changed — please login again" } };
    }
    if ((dbUser.token_version ?? 0) !== (user.token_version ?? 0)) {
      return { error: { status: 401, message: "Session invalidated — please login again" } };
    }

    return { user: { ...user, token_version: dbUser.token_version ?? 0 } };
  } catch {
    return { error: { status: 401, message: "Invalid or expired access token" } };
  }
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}
