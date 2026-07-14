// API route for instructors to generate signed session QR codes (JWT protected).
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { connectDB } from "../../lib/db";
import Course from "../../lib/models/Course.js";
import Session from "../../lib/models/Session.js";
import User from "../../lib/models/User.js";
import { createQRPayload } from "../../lib/qr";
import { authenticateRequest } from "../../lib/apiAuth";
import { validateBody } from "../../lib/validateRequest";
import { generateQRSchema } from "../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../lib/rateLimit";
import { logAudit } from "../../lib/audit";
import { toObjectId, docId } from "../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["instructor"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const rl = await rateLimit(req, {
      key: getRateLimitKey(req, "generateQR", auth.user.id),
      max: 30,
      windowMs: 60 * 1000
    });
    if (rl.limited) {
      return res.status(429).json({ message: "Too many QR generation requests" });
    }

    await connectDB();
    const parsed = validateBody(req.body, generateQRSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error);
    }

    const courseId = parsed.data.course_id;
    const instructorObjectId = toObjectId(auth.user.id);

    // Verify course belongs to this instructor
    const course = await Course.findOne({
      _id: toObjectId(courseId),
      instructor_id: instructorObjectId,
      is_active: true
    }).lean();

    if (!course) {
      await logAudit({
        req,
        userId: auth.user.id,
        action: "qr_generated",
        status: "failed",
        metadata: { reason: "course_not_found_or_not_authorized" }
      });
      return res.status(403).json({ message: "Course not found or you are not authorized to generate QR for this course" });
    }

    const instructor = await User.findById(instructorObjectId).select("name email").lean();
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    // Deactivate previous active sessions for this course
    await Session.updateMany(
      { course_id: course._id, is_active: true },
      { is_active: false }
    );

    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 1000); // 30 seconds expiry

    // Create session with full course and instructor info
    const session = await Session.create({
      session_id: sessionId,
      course_id: course._id,
      course_code: course.course_code,
      course_name: course.course_name,
      instructor_id: instructorObjectId,
      instructor_name: instructor.name,
      is_active: true,
      expires_at: expiresAt,
      qr_generated_at: new Date(now)
    });

    // Create QR payload with full information
    const payload = createQRPayload({
      sessionId: sessionId,
      instructorId: docId(course.instructor_id),
      instructorName: instructor.name,
      subject: course.course_name
    });

    const qrImage = await QRCode.toDataURL(JSON.stringify(payload));

    await logAudit({
      req,
      userId: auth.user.id,
      action: "qr_generated",
      resource: sessionId,
      status: "success",
      metadata: {
        course_id: docId(course._id),
        course_code: course.course_code,
        course_name: course.course_name
      }
    });

    return res.status(200).json({
      message: "QR generated successfully",
      qrImage,
      session: payload,
      course_id: docId(course._id),
      course_code: course.course_code,
      expires_in_seconds: 30
    });
  } catch (error) {
    console.error("GenerateQR error:", error);
    return res.status(500).json({ message: "Server error while generating QR" });
  }
}
