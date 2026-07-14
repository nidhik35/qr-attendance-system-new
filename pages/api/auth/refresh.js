import { connectDB } from "../../../lib/db";
import User from "../../../lib/models/User.js";
import { verifyRefreshToken } from "../../../lib/jwt";
import {
  getRefreshTokenFromRequest,
  rotateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie
} from "../../../lib/refreshToken";
import { rateLimit, getRateLimitKey } from "../../../lib/rateLimit";
import { docId } from "../../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rl = await rateLimit(req, {
    key: getRateLimitKey(req, "auth:refresh"),
    max: 30,
    windowMs: 60 * 1000
  });
  if (rl.limited) {
    return res.status(429).json({ message: "Too many refresh attempts" });
  }

  try {
    await connectDB();
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const result = await rotateRefreshToken(refreshToken, decoded);
    if (result.error) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: result.error });
    }

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "User not found" });
    }

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: {
        id: docId(user),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ message: "Server error during token refresh" });
  }
}
