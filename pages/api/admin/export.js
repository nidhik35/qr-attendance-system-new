// Admin CSV export for attendance records (JWT protected).
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
        a.date,
        a.ip_address
      FROM attendance a
      JOIN students st ON st.id = a.student_id
      LEFT JOIN sessions s ON s.session_id = a.session_id
      ORDER BY a.date DESC
    `);

    const header = [
      "student_name",
      "student_email",
      "course_id",
      "session_id",
      "status",
      "date",
      "ip_address"
    ];
    const csvLines = [header.join(",")];

    for (const row of rows) {
      csvLines.push(
        [
          row.student_name,
          row.student_email,
          row.course_id,
          row.session_id,
          row.status,
          new Date(row.date).toISOString(),
          row.ip_address || ""
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      );
    }

    const csv = csvLines.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="attendance-export.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error("Admin export error:", error);
    return res.status(500).json({ message: "Server error while exporting data" });
  }
}
