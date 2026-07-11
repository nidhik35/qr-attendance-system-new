// Validate scanned QR and issue a one-time attendance challenge token (student-only).
import db from "../../../lib/db";
import { authenticateRequest, getClientIp } from "../../../lib/apiAuth";
import { validateQrTimestamp, verifyQrSignature } from "../../../lib/qr";
import { signAttendanceChallengeToken } from "../../../lib/jwt";
import { validateBody } from "../../../lib/validateRequest";
import { qrChallengeSchema } from "../../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../../lib/rateLimit";
import { logAudit } from "../../../lib/audit";
import { getDeviceId } from "../../../lib/device";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const rl = await rateLimit(req, {
      key: getRateLimitKey(req, "qr:challenge", auth.user.id),
      max: 20,
      windowMs: 60 * 1000
    });
    if (rl.limited) {
      return res.status(429).json({ message: "Too many QR challenge requests" });
    }

    const parsed = validateBody(req.body, qrChallengeSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error);
    }

    const { session_id, timestamp, nonce, signature, device_id } = parsed.data;
    const studentId = auth.user.id;
    const clientIp = getClientIp(req);
    const normalizedDevice = getDeviceId(device_id || req.headers["user-agent"] || "unknown");

    if (!verifyQrSignature(session_id, timestamp, nonce, signature)) {
      await logAudit({
        req,
        userId: studentId,
        action: "qr_challenge",
        resource: session_id,
        status: "failed",
        metadata: { reason: "invalid_signature", ip: clientIp }
      });
      return res.status(400).json({ message: "Invalid QR signature — screenshot or tampered code rejected" });
    }

    const tsCheck = validateQrTimestamp(timestamp);
    if (!tsCheck.valid) {
      await logAudit({
        req,
        userId: studentId,
        action: "qr_challenge",
        resource: session_id,
        status: "failed",
        metadata: { reason: tsCheck.reason, ip: clientIp }
      });
      return res.status(400).json({
        message: tsCheck.reason === "future_timestamp" ? "Device clock skew too large" : "QR expired"
      });
    }

    const [sessions] = await db.execute(
      `SELECT s.session_id, s.course_id, s.created_at, s.is_active
       FROM sessions s
       WHERE s.session_id = ?`,
      [session_id]
    );

    if (sessions.length === 0 || !sessions[0].is_active) {
      await logAudit({
        req,
        userId: studentId,
        action: "qr_challenge",
        resource: session_id,
        status: "failed",
        metadata: { reason: "invalid_session", ip: clientIp }
      });
      return res.status(400).json({ message: "Invalid or inactive session" });
    }

    const session = sessions[0];
    const sessionAge = Date.now() - new Date(session.created_at).getTime();
    if (sessionAge > 35 * 1000) {
      await logAudit({
        req,
        userId: studentId,
        action: "qr_challenge",
        resource: session_id,
        status: "failed",
        metadata: { reason: "session_window_closed", ip: clientIp }
      });
      return res.status(400).json({ message: "Session window closed — ask instructor for a new QR" });
    }

    const [students] = await db.execute(
      "SELECT device_id FROM students WHERE id = ?",
      [studentId]
    );
    if (students[0]?.device_id && students[0].device_id !== normalizedDevice) {
      await logAudit({
        req,
        userId: studentId,
        action: "qr_challenge",
        resource: session_id,
        status: "flagged",
        metadata: { reason: "device_mismatch", ip: clientIp }
      });
      return res.status(403).json({ message: "Device mismatch" });
    }

    const attendanceChallengeToken = signAttendanceChallengeToken({
      studentId,
      sessionId: session_id,
      courseId: session.course_id,
      deviceId: normalizedDevice,
      qrTimestamp: Number(timestamp)
    });

    await logAudit({
      req,
      userId: studentId,
      action: "qr_challenge",
      resource: session_id,
      status: "success",
      metadata: { course_id: session.course_id, ip: clientIp, device: normalizedDevice }
    });

    return res.status(200).json({
      success: true,
      attendance_challenge_token: attendanceChallengeToken,
      session_id,
      course_id: session.course_id
    });
  } catch (error) {
    console.error("QR challenge error:", error);
    return res.status(500).json({ message: "Server error during QR challenge" });
  }
}
