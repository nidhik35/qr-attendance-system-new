// Admin printable report export (JWT protected, HTML -> print as PDF).
import db from "../../../lib/db";
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

    const [rows] = await db.execute(`
      SELECT
        st.name AS student_name,
        st.email AS student_email,
        s.course_id,
        a.session_id,
        a.status,
        a.date
      FROM attendance a
      JOIN students st ON st.id = a.student_id
      LEFT JOIN sessions s ON s.session_id = a.session_id
      ORDER BY a.date DESC
      LIMIT 300
    `);

    const tableRows = rows
      .map(
        (row) => `
      <tr>
        <td>${row.student_name}</td>
        <td>${row.student_email}</td>
        <td>${row.course_id || "N/A"}</td>
        <td>${row.session_id}</td>
        <td>${row.status}</td>
        <td>${new Date(row.date).toLocaleString()}</td>
      </tr>`
      )
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
