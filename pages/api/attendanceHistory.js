// API route to return attendance history for a student.
import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const studentId = req.query.student_id;
    if (!studentId) {
      return res.status(400).json({ message: "student_id query parameter is required" });
    }

    const [students] = await db.execute("SELECT role FROM students WHERE id = ?", [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (students[0].role !== "student") {
      return res.status(403).json({ message: "Only student attendance history is allowed" });
    }

    const [records] = await db.execute(
      "SELECT a.session_id, a.status, a.date, s.course_id FROM attendance a LEFT JOIN sessions s ON a.session_id = s.session_id WHERE a.student_id = ? ORDER BY a.date DESC",
      [studentId]
    );

    return res.status(200).json({ attendance: records });
  } catch (error) {
    console.error("Attendance history error:", error);
    return res.status(500).json({ message: "Server error while fetching attendance history" });
  }
}
