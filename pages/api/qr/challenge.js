// Validate scanned QR and issue a one-time attendance challenge token (student-only).
import { connectDB } from "../../../lib/db";
import Session from "../../../lib/models/Session.js";
import User from "../../../lib/models/User.js";
import { authenticateRequest, getClientIp } from "../../../lib/apiAuth";
import { validateQrTimestamp, verifyQrSignature } from "../../../lib/qr";
import { signAttendanceChallengeToken } from "../../../lib/jwt";
import { validateBody } from "../../../lib/validateRequest";
import { qrChallengeSchema } from "../../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../../lib/rateLimit";
import { logAudit } from "../../../lib/audit";
import { getDeviceId } from "../../../lib/device";
import { toObjectId } from "../../../lib/mongo";

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

    await connectDB();
    const parsed = validateBody(req.body, qrChallengeSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error);
    }

    const { session_id, timestamp, expires_at, nonce, signature, device_id } = parsed.data;
    const studentId = auth.user.id;
    const clientIp = getClientIp(req);
    const normalizedDevice = getDeviceId(device_id || req.headers["user-agent"] || "unknown");

    // Build the full payload for signature verification
    const qrPayload = {
      session_id,
      timestamp,
      expires_at,
      nonce,
      signature,
      instructor_id: parsed.data.instructor_id,
      instructor_name: parsed.data.instructor_name,
      subject: parsed.data.subject
    };

    // Verify QR signature
    if (!verifyQrSignature(qrPayload)) {
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

    // Validate QR timestamp
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

    // Fetch and validate session
    const session = await Session.findOne({ session_id }).lean();

    if (!session || !session.is_active) {
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

    // Check if session has expired (safety check)
    const sessionAge = Date.now() - new Date(session.qr_generated_at).getTime();
    if (sessionAge > 35 * 1000) { // 30s + 5s tolerance
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

    // Verify device match
    const student = await User.findById(toObjectId(studentId)).select("device_id").lean();
    if (student?.device_id && student.device_id !== normalizedDevice) {
      await logAudit({
        req,
        userId: studentId,
        action: "qr_challenge",
        resource: session_id,
        status: "flagged",
        metadata: { reason: "device_mismatch", ip: clientIp }
      });
      return res.status(403).json({ message: "Device mismatch — QR forwarding detected" });
    }

    // Create attendance challenge token
    const attendanceChallengeToken = signAttendanceChallengeToken({
      studentId,
      sessionId: session_id,
      courseId: String(session.course_id),
      instructorId: String(session.instructor_id),
      deviceId: normalizedDevice,
      qrTimestamp: Number(timestamp)
    });

    await logAudit({
      req,
      userId: studentId,
      action: "qr_challenge",
      resource: session_id,
      status: "success",
      metadata: {
        course_id: String(session.course_id),
        course_code: session.course_code,
        ip: clientIp,
        device: normalizedDevice
      }
    });

    return res.status(200).json({
      success: true,
      attendance_challenge_token: attendanceChallengeToken,
      session_id,
      course_id: String(session.course_id),
      course_code: session.course_code
    });
  } catch (error) {
    console.error("QR challenge error:", error);
    return res.status(500).json({ message: "Server error during QR challenge" });
  }
}
