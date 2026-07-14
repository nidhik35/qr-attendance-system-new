// Audit log helper — records security-relevant events for admin review.
import { connectDB } from "./db";
import AuditLog from "./models/AuditLog.js";
import { getClientIp } from "./apiAuth";
import { toObjectId } from "./mongo";

export async function logAudit({
  req,
  userId = null,
  action,
  resource = null,
  status = "success",
  metadata = null
}) {
  try {
    await connectDB();
    const ip = req ? getClientIp(req) : null;
    const userAgent = req?.headers?.["user-agent"] || null;
    await AuditLog.create({
      user_id: userId ? toObjectId(userId) : null,
      action,
      resource,
      status,
      ip_address: ip,
      user_agent: userAgent,
      metadata
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}
