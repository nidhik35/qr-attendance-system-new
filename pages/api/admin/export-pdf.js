// Admin printable report export (JWT protected, HTML -> print as PDF).
import { connectDB } from "../../../lib/db";
import Attendance from "../../../lib/models/Attendance.js";
import User from "../../../lib/models/User.js";
import Session from "../../../lib/models/Session.js";
import { authenticateRequest } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["admin"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    await connectDB();
    const rows = await Attendance.find().sort({ date: -1 }).limit(300).lean();
    const studentIds = [...new Set(rows.map((r) => String(r.student_id)))];
    const sessionIds = [...new Set(rows.map((r) => r.session_id))];

    const [students, sessions] = await Promise.all([
      User.find({ _id: { $in: studentIds } }).select("name email").lean(),
      Session.find({ session_id: { $in: sessionIds } }).lean()
    ]);

    const studentMap = Object.fromEntries(students.map((s) => [String(s._id), s]));
    const sessionMap = Object.fromEntries(sessions.map((s) => [s.session_id, s]));

    const tableRows = rows
      .map((row) => {
        const student = studentMap[String(row.student_id)];
        const session = sessionMap[row.session_id];
        return `
      <tr>
        <td>${student?.name || ""}</td>
        <td>${student?.email || ""}</td>
        <td>${session?.course_id || "N/A"}</td>
        <td>${row.session_id}</td>
        <td>${row.status}</td>
        <td>${new Date(row.date).toLocaleString()}</td>
      </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Attendance Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    h1 { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f3f3f3; }
  </style>
</head>
<body>
  <h1>QR Attendance Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th>Student</th>
        <th>Email</th>
        <th>Course</th>
        <th>Session</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || "<tr><td colspan='6'>No records</td></tr>"}
    </tbody>
  </table>
  <p style="margin-top:16px;">Use browser Print -> Save as PDF.</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", 'attachment; filename="attendance-report.html"');
    return res.status(200).send(html);
  } catch (error) {
    console.error("Report export error:", error);
    return res.status(500).json({ message: "Server error while exporting report" });
  }
}
