// API route for instructors to generate signed session QR codes (JWT protected).
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import db from "../../lib/db";
import { createQRPayload } from "../../lib/qr";
import { authenticateRequest } from "../../lib/apiAuth";
import { validateBody } from "../../lib/validateRequest";
import { generateQRSchema } from "../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../lib/rateLimit";
import { logAudit } from "../../lib/audit";

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

    const parsed = validateBody(req.body, generateQRSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error);
    }

    const courseCode = parsed.data.course_id || "CSE101";

    const [courses] = await db.execute(
      "SELECT course_code FROM courses WHERE course_code = ? AND instructor_id = ?",
      [courseCode, auth.user.id]
    );

    if (courses.length === 0) {
      return res.status(403).json({ message: "You are not assigned to this course" });
    }

    // Deactivate previous active sessions for this course.
    await db.execute(
      "UPDATE sessions SET is_active = 0 WHERE course_id = ? AND is_active = 1",
      [courseCode]
    );

    const sessionId = uuidv4();
    await db.execute(
      "INSERT INTO sessions (session_id, course_id, is_active) VALUES (?, ?, 1)",
      [sessionId, courseCode]
    );

    const payload = createQRPayload(sessionId);
    const qrImage = await QRCode.toDataURL(JSON.stringify(payload));

    await logAudit({
      req,
      userId: auth.user.id,
      action: "qr_generated",
      resource: sessionId,
      status: "success",
      metadata: { course_id: courseCode }
    });

    return res.status(200).json({
      message: "QR generated successfully",
      qrImage,
      session: payload,
      course_id: courseCode
    });
  } catch (error) {
    console.error("GenerateQR error:", error);
    return res.status(500).json({ message: "Server error while generating QR" });
  }
}
