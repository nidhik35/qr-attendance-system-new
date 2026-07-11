// Audit log helper — records security-relevant events for admin review.
import db from "./db";
import { getClientIp } from "./apiAuth";

export async function logAudit({
  req,
  userId = null,
  action,
  resource = null,
  status = "success",
  metadata = null
}) {
  try {
    const ip = req ? getClientIp(req) : null;
    const userAgent = req?.headers?.["user-agent"] || null;
    await db.execute(
      `INSERT INTO audit_logs
        (user_id, action, resource, status, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        resource,
        status,
        ip,
        userAgent,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}
