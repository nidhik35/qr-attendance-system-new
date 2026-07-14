// API route to verify attendance with challenge tokens, liveness, face, and geofence checks.
import { connectDB } from "../../lib/db";
import User from "../../lib/models/User.js";
import Session from "../../lib/models/Session.js";
import Course from "../../lib/models/Course.js";
import Attendance from "../../lib/models/Attendance.js";
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
import { toObjectId, isDuplicateKeyError, docId } from "../../lib/mongo";

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
    await connectDB();
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
    const courseId = toObjectId(challengePayload.courseId);
    const instructorId = toObjectId(challengePayload.instructorId);
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

    const session = await Session.findOne({ session_id }).lean();
    if (!session || !session.is_active) {
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

    // Fetch course and instructor info
    const course = await Course.findById(courseId).lean();
    const instructor = await User.findById(instructorId).select("name email").lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const student = await User.findById(toObjectId(studentId))
      .select("device_id role email name face_descriptor")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.face_descriptor) {
      return res.status(403).json({ message: "Face not registered. Complete face setup first." });
    }

    // Parse face descriptor if stored as JSON string
    const storedDescriptor = Array.isArray(student.face_descriptor)
      ? student.face_descriptor
      : JSON.parse(student.face_descriptor);

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

    // Update or set student device ID
    if (!student.device_id) {
      await User.updateOne({ _id: student._id }, { device_id: normalizedDeviceId });
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

    // IP conflict check
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const ipConflict = await Attendance.findOne({
      ip_address: clientIp,
      student_id: { $ne: toObjectId(studentId) },
      date: { $gte: tenMinutesAgo }
    }).lean();

    if (ipConflict) {
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

    // Device conflict check
    const recentAttendance = await Attendance.find({ date: { $gte: tenMinutesAgo } })
      .populate({ path: "student_id", select: "device_id" })
      .lean();

    const deviceConflict = recentAttendance.find(
      (a) =>
        a.student_id &&
        String(a.student_id._id) !== studentId &&
        a.student_id.device_id === normalizedDeviceId
    );

    if (deviceConflict) {
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

    // Geofence check
    const courseConfig = {
      classroom_lat: course.classroom_lat,
      classroom_lng: course.classroom_lng,
      radius_meters: course.radius_meters
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

    // Record attendance with full course and instructor info
    try {
      await Attendance.create({
        student_id: toObjectId(studentId),
        student_name: student.name,
        instructor_id: instructorId,
        instructor_name: instructor?.name || "Unknown",
        course_id: courseId,
        course_code: course.course_code,
        course_name: course.course_name,
        session_id,
        status: "present",
        ip_address: clientIp,
        face_verified: true,
       liveness_verified: !!liveness_token,
        latitude,
        longitude,
        date: new Date()
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
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
        course_id: docId(courseId),
        course_code: course.course_code,
        ip: clientIp,
        lat: latitude,
        lng: longitude,
        distance: geo.distance
      }
    });

    sendAttendanceConfirmation({
      to: student.email,
      name: student.name,
      courseCode: course.course_code
    }).catch(() => null);

    // Calculate attendance percentage for this course
    const courseSessions = await Session.find({ course_id: courseId }).select("session_id").lean();
    const courseSessionIds = courseSessions.map((s) => s.session_id);
    const total = courseSessionIds.length;
    const attended = await Attendance.countDocuments({
      student_id: toObjectId(studentId),
      course_id: courseId,
      session_id: { $in: courseSessionIds }
    });
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
