// API route to return attendance history for logged-in student (JWT protected).
import db from "../../lib/db";
import { authenticateRequest } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const [records] = await db.execute(
      `SELECT a.session_id, a.status, a.date, s.course_id
       FROM attendance a
       LEFT JOIN sessions s ON a.session_id = s.session_id
       WHERE a.student_id = ?
       ORDER BY a.date DESC`,
      [auth.user.id]
    );

    return res.status(200).json({ attendance: records });
  } catch (error) {
    console.error("Attendance history error:", error);
    return res.status(500).json({ message: "Server error while fetching attendance history" });
  }
}
