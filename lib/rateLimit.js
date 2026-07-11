// MySQL-backed rate limiter (works across restarts; suitable for single-instance/small deploys).
import db from "./db";

const DEFAULT_WINDOW_MS = 60 * 1000;

export async function rateLimit(req, { key, max = 10, windowMs = DEFAULT_WINDOW_MS }) {
  const rateKey = `${key}:${Math.floor(Date.now() / windowMs)}`;

  try {
    await db.execute(
      "INSERT INTO rate_limits (rate_key, created_at) VALUES (?, NOW())",
      [rateKey]
    );

    const [rows] = await db.execute(
      "SELECT COUNT(*) AS cnt FROM rate_limits WHERE rate_key = ?",
      [rateKey]
    );
    const count = Number(rows[0]?.cnt || 0);

    // Opportunistic cleanup of old buckets (non-blocking).
    db.execute(
      "DELETE FROM rate_limits WHERE created_at < (NOW() - INTERVAL 2 HOUR)"
    ).catch(() => null);

    if (count > max) {
      return { limited: true, retryAfterMs: windowMs };
    }
    return { limited: false };
  } catch {
    // Fail open if rate-limit table unavailable.
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
