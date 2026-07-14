// MongoDB-backed rate limiter.
import { connectDB } from "./db";
import RateLimit from "./models/RateLimit.js";

const DEFAULT_WINDOW_MS = 60 * 1000;

export async function rateLimit(req, { key, max = 10, windowMs = DEFAULT_WINDOW_MS }) {
  const rateKey = `${key}:${Math.floor(Date.now() / windowMs)}`;

  try {
    await connectDB();
    await RateLimit.create({ rate_key: rateKey });

    const count = await RateLimit.countDocuments({ rate_key: rateKey });

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    RateLimit.deleteMany({ created_at: { $lt: twoHoursAgo } }).catch(() => null);

    if (count > max) {
      return { limited: true, retryAfterMs: windowMs };
    }
    return { limited: false };
  } catch {
    return { limited: false };
  }
}

export function getRateLimitKey(req, route, userId = null) {
  const ip =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : null) || req.socket?.remoteAddress || "unknown";
  return userId ? `${route}:user:${userId}` : `${route}:ip:${ip}`;
}
