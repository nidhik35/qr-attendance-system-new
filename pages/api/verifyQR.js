// API route to verify attendance with challenge tokens, liveness, face, and geofence checks.
import db from "../../lib/db";
import { getDeviceId } from "../../lib/device";
import { authenticateRequest, getClientIp } from "../../lib/apiAuth";
import { isInsideClassroom } from "../../lib/geofence";
import { sendAttendanceConfirmation, sendLowAttendanceWarning } from "../../lib/email";
import { isFaceMatch } from "../../lib/faceMatch";
import { verifyTypedToken } from "../../lib/jwt";
import { validateBody } from "../../lib/validateRequest";
import { verifyQRSchema } from "../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../lib/rateLimit";
import { logAudit } from "../../lib/audit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await authenticateRequest(req, ["student"]);
  if (auth.error) {
    return res.status(auth.error.status).json({ message: auth.error.message });
  }

  const studentId = auth.user.id;
  const clientIp = getClientIp(req);

  const rl = await rateLimit(req, {
    key: getRateLimitKey(req, "verifyQR", studentId),
    max: 10,
    windowMs: 60 * 1000
  });
  if (rl.limited) {
    await logAudit({
      req,
      userId: studentId,
      action: "attendance_mark",
      status: "flagged",
      metadata: { reason: "rate_limited", ip: clientIp }
    });
    return res.status(429).json({ message: "Too many attendance attempts. Please wait." });
  }

  try {
    const parsed = validateBody(req.body, verifyQRSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json({ message: parsed.error.message, details: parsed.error.details });
    }

    const {
      attendance_challenge_token,
      liveness_token,
      device_id,
      latitude,
      longitude,
      face_descriptor
    } = parsed.data;

    let challengePayload;
    let livenessPayload;
    try {
      challengePayload = verifyTypedToken(attendance_challenge_token, "attendance_challenge");
      livenessPayload = verifyTypedToken(liveness_token, "liveness");
    } catch {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        status: "failed",
        metadata: { reason: "invalid_tokens", ip: clientIp }
      });
      return res.status(400).json({ message: "Invalid or expired challenge tokens" });
    }

    if (challengePayload.studentId !== studentId || livenessPayload.userId !== studentId) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        status: "flagged",
        metadata: { reason: "token_user_mismatch", ip: clientIp }
      });
      return res.status(403).json({ message: "Token user mismatch" });
    }

    const session_id = challengePayload.sessionId;
    const normalizedDeviceId = getDeviceId(device_id || req.headers["user-agent"] || "unknown");

    if (challengePayload.deviceId !== normalizedDeviceId) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "flagged",
        metadata: { reason: "device_mismatch", ip: clientIp }
      });
      return res.status(403).json({ message: "Device mismatch — forwarded QR rejected" });
    }

    const [sessions] = await db.execute(
      `SELECT s.session_id, s.course_id, s.is_active, c.classroom_lat, c.classroom_lng, c.radius_meters
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.course_code
       WHERE s.session_id = ?`,
      [session_id]
    );

    if (sessions.length === 0 || !sessions[0].is_active) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "failed",
        metadata: { reason: "invalid_session", ip: clientIp }
      });
      return res.status(400).json({ message: "Invalid session" });
    }

    const [students] = await db.execute(
      "SELECT device_id, role, email, name, face_descriptor FROM students WHERE id = ?",
      [studentId]
    );
    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = students[0];

    if (!student.face_descriptor) {
      return res.status(403).json({ message: "Face not registered. Complete face setup first." });
    }

    const storedDescriptor = JSON.parse(student.face_descriptor);
    const faceResult = isFaceMatch(storedDescriptor, face_descriptor);
    if (!faceResult.matched) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "failed",
        metadata: { reason: "face_mismatch", distance: faceResult.distance, ip: clientIp }
      });
      return res.status(403).json({ message: "Face verification failed" });
    }

    if (!student.device_id) {
      await db.execute("UPDATE students SET device_id = ? WHERE id = ?", [
        normalizedDeviceId,
        studentId
      ]);
    } else if (student.device_id !== normalizedDeviceId) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "flagged",
        metadata: { reason: "registered_device_mismatch", ip: clientIp }
      });
      return res.status(403).json({ message: "Device mismatch. Use your registered device." });
    }

    const [ipConflicts] = await db.execute(
      `SELECT student_id FROM attendance
       WHERE ip_address = ? AND student_id <> ?
       AND date >= (NOW() - INTERVAL 10 MINUTE)
       LIMIT 1`,
      [clientIp, studentId]
    );
    if (ipConflicts.length > 0) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "flagged",
        metadata: { reason: "shared_ip", ip: clientIp }
      });
      return res.status(403).json({ message: "Suspicious activity detected on shared network" });
    }

    const [deviceConflicts] = await db.execute(
      `SELECT a.student_id
       FROM attendance a
       JOIN students st ON st.id = a.student_id
       WHERE st.device_id = ? AND a.student_id <> ?
       AND a.date >= (NOW() - INTERVAL 10 MINUTE)
       LIMIT 1`,
      [normalizedDeviceId, studentId]
    );
    if (deviceConflicts.length > 0) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "flagged",
        metadata: { reason: "shared_device", ip: clientIp }
      });
      return res.status(403).json({ message: "Multiple accounts detected on same device" });
    }

    const courseConfig = {
      classroom_lat: sessions[0].classroom_lat,
      classroom_lng: sessions[0].classroom_lng,
      radius_meters: sessions[0].radius_meters
    };
    const geo = isInsideClassroom(latitude, longitude, courseConfig);
    if (!geo.allowed) {
      await logAudit({
        req,
        userId: studentId,
        action: "attendance_mark",
        resource: session_id,
        status: "failed",
        metadata: {
          reason: "geofence",
          distance: geo.distance,
          radius: geo.radius,
          lat: latitude,
          lng: longitude,
          ip: clientIp
        }
      });
      return res.status(403).json({ message: "You are not in classroom" });
    }

    try {
      await db.execute(
        "INSERT INTO attendance (student_id, session_id, status, ip_address) VALUES (?, ?, ?, ?)",
        [studentId, session_id, "present", clientIp]
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        await logAudit({
          req,
          userId: studentId,
          action: "attendance_mark",
          resource: session_id,
          status: "failed",
          metadata: { reason: "duplicate", ip: clientIp }
        });
        return res.status(409).json({ message: "Attendance already marked" });
      }
      throw error;
    }

    await logAudit({
      req,
      userId: studentId,
      action: "attendance_mark",
      resource: session_id,
      status: "success",
      metadata: {
        course_id: sessions[0].course_id,
        ip: clientIp,
        lat: latitude,
        lng: longitude,
        distance: geo.distance
      }
    });

    sendAttendanceConfirmation({
      to: student.email,
      name: student.name,
      courseCode: sessions[0].course_id
    }).catch(() => null);

    const [stats] = await db.execute(
      `SELECT
         COUNT(DISTINCT s.session_id) AS total_sessions,
         COUNT(DISTINCT a.session_id) AS attended_sessions
       FROM sessions s
       LEFT JOIN attendance a
         ON a.session_id = s.session_id AND a.student_id = ?
       WHERE s.course_id = ?`,
      [studentId, sessions[0].course_id || ""]
    );
    const total = Number(stats[0]?.total_sessions || 0);
    const attended = Number(stats[0]?.attended_sessions || 0);
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
    if (percentage < 50) {
      sendLowAttendanceWarning({
        to: student.email,
        name: student.name,
        percentage
      }).catch(() => null);
    }

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      attendancePercentage: percentage
    });
  } catch (error) {
    console.error("VerifyQR error:", error);
    await logAudit({
      req,
      userId: studentId,
      action: "attendance_mark",
      status: "failed",
      metadata: { reason: "server_error", ip: clientIp }
    });
    return res.status(500).json({
      success: false,
      message: "Server error during attendance verification"
    });
  }
}
