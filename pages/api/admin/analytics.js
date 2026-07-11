// Admin analytics API with audit log feed (JWT protected, admin role only).
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

    const [[counts]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM students WHERE role = 'student') AS total_students,
        (SELECT COUNT(*) FROM students WHERE role = 'instructor') AS total_instructors,
        (SELECT COUNT(*) FROM sessions) AS total_sessions,
        (SELECT COUNT(*) FROM attendance) AS total_attendance
    `);

    const [courseStats] = await db.query(`
      SELECT
        s.course_id,
        COUNT(DISTINCT s.session_id) AS sessions_count,
        COUNT(a.id) AS present_count
      FROM sessions s
      LEFT JOIN attendance a ON a.session_id = s.session_id
      GROUP BY s.course_id
      ORDER BY present_count DESC
    `);

    const [monthlyStats] = await db.query(`
      SELECT
        DATE_FORMAT(a.date, '%Y-%m') AS month,
        COUNT(*) AS attendance_count
      FROM attendance a
      GROUP BY DATE_FORMAT(a.date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 6
    `);

    const [lowAttendance] = await db.query(`
      SELECT
        st.id,
        st.name,
        st.email,
        COUNT(DISTINCT s.session_id) AS total_sessions,
        COUNT(DISTINCT a.session_id) AS attended_sessions,
        ROUND(
          (COUNT(DISTINCT a.session_id) / NULLIF(COUNT(DISTINCT s.session_id), 0)) * 100,
          2
        ) AS attendance_percentage
      FROM students st
      CROSS JOIN sessions s
      LEFT JOIN attendance a
        ON a.student_id = st.id AND a.session_id = s.session_id
      WHERE st.role = 'student'
      GROUP BY st.id, st.name, st.email
      HAVING attendance_percentage < 50 OR attendance_percentage IS NULL
      ORDER BY attendance_percentage ASC
      LIMIT 20
    `);

    const [auditLogs] = await db.query(`
      SELECT
        al.id,
        al.user_id,
        st.name AS user_name,
        al.action,
        al.resource,
        al.status,
        al.ip_address,
        al.created_at,
        al.metadata
      FROM audit_logs al
      LEFT JOIN students st ON st.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);

    const [auditSummary] = await db.query(`
      SELECT
        status,
        COUNT(*) AS count
      FROM audit_logs
      WHERE created_at >= (NOW() - INTERVAL 7 DAY)
      GROUP BY status
    `);

    return res.status(200).json({
      summary: counts,
      courseStats,
      monthlyStats,
      lowAttendance,
      auditLogs,
      auditSummary
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return res.status(500).json({ message: "Server error while loading analytics" });
  }
}
