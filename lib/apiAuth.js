// Reusable API authentication and role authorization helpers.
import db from "./db";
import { verifyAccessToken } from "./jwt";

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

    const [rows] = await db.execute(
      "SELECT token_version, role FROM students WHERE id = ?",
      [user.id]
    );
    if (rows.length === 0) {
      return { error: { status: 401, message: "User no longer exists" } };
    }

    const dbUser = rows[0];
    if (dbUser.role !== user.role) {
      return { error: { status: 401, message: "Role changed — please login again" } };
    }
    if ((dbUser.token_version ?? 0) !== (user.token_version ?? 0)) {
      return { error: { status: 401, message: "Session invalidated — please login again" } };
    }

    return { user: { ...user, token_version: dbUser.token_version ?? 0 } };
  } catch (error) {
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
