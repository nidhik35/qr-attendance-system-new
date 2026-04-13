// API route for instructors to generate session QR codes.
// Role-based authentication: Only users with 'instructor' role can access this endpoint.
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import db from "../../lib/db";
import { createQRPayload } from "../../lib/qr";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { user_id, course_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "Authenticated user is required" });
    }

    // Role-based authentication: Only database instructor role is allowed.
    const [users] = await db.execute("SELECT id, role FROM students WHERE id = ?", [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role !== "instructor") {
      return res.status(403).json({ message: "Only instructor can generate QR" });
    }

    const sessionId = uuidv4();
    const courseId = course_id || "default-course";

    await db.execute("INSERT INTO sessions (session_id, course_id) VALUES (?, ?)", [
      sessionId,
      courseId
    ]);

    const payload = createQRPayload(sessionId);
    const qrImage = await QRCode.toDataURL(JSON.stringify(payload));

    return res.status(200).json({
      message: "QR generated successfully",
      qrImage,
      session: payload
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error while generating QR" });
  }
}
