// Admin analytics API with audit log feed (JWT protected, admin role only).
import { connectDB } from "../../../lib/db";
import User from "../../../lib/models/User.js";
import Course from "../../../lib/models/Course.js";
import Session from "../../../lib/models/Session.js";
import Attendance from "../../../lib/models/Attendance.js";
import AuditLog from "../../../lib/models/AuditLog.js";
import { authenticateRequest } from "../../../lib/apiAuth";
import { docId, toObjectId } from "../../../lib/mongo";

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

    const [total_students, total_instructors, total_courses, total_sessions, total_attendance] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "instructor" }),
      Course.countDocuments(),
      Session.countDocuments(),
      Attendance.countDocuments()
    ]);

    const courses = await Course.find().select("_id course_code course_name instructor_id").lean();
    const sessions = await Session.find().lean();
    const allAttendance = await Attendance.find().lean();
    
    const courseStatsMap = {};
    for (const c of courses) {
      const courseId = docId(c);
      courseStatsMap[courseId] = {
        course_id: courseId,
        course_code: c.course_code,
        course_name: c.course_name,
        sessions_count: 0,
        present_count: 0
      };
    }

    for (const s of sessions) {
      const courseId = docId(s.course_id);
      if (courseStatsMap[courseId]) {
        courseStatsMap[courseId].sessions_count += 1;
      }
    }

    const sessionCourseMap = Object.fromEntries(sessions.map((s) => [s.session_id, docId(s.course_id)]));
    for (const a of allAttendance) {
      const courseId = sessionCourseMap[a.session_id];
      if (courseId && courseStatsMap[courseId]) {
        courseStatsMap[courseId].present_count += 1;
      }
    }

    const courseStats = Object.values(courseStatsMap)
      .filter((c) => c.sessions_count > 0)
      .sort((a, b) => b.present_count - a.present_count);

    const monthlyStats = await Attendance.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          attendance_count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 6 },
      { $project: { month: "$_id", attendance_count: 1, _id: 0 } }
    ]);

    const students = await User.find({ role: "student" }).select("name email").lean();
    const sessionIds = sessions.map((s) => s.session_id);
    const studentAttendance = await Attendance.find({ session_id: { $in: sessionIds } }).lean();

    const attendanceByStudent = {};
    for (const a of studentAttendance) {
      const sid = docId(a.student_id);
      if (!attendanceByStudent[sid]) attendanceByStudent[sid] = new Set();
      attendanceByStudent[sid].add(a.session_id);
    }

    const totalSessions = sessionIds.length;
    const lowAttendance = students
      .map((st) => {
        const sid = docId(st);
        const attended = attendanceByStudent[sid]?.size || 0;
        const attendance_percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 10000) / 100 : 0;
        return {
          id: sid,
          name: st.name,
          email: st.email,
          total_sessions: totalSessions,
          attended_sessions: attended,
          attendance_percentage
        };
      })
      .filter((s) => s.attendance_percentage < 50)
      .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
      .slice(0, 20);

    const auditLogsRaw = await AuditLog.find().sort({ created_at: -1 }).limit(100).lean();
    const auditUserIds = [...new Set(auditLogsRaw.map((l) => docId(l.user_id)).filter(Boolean))];
    const auditUsers = await User.find({ _id: { $in: auditUserIds.map(toObjectId) } }).select("name").lean();
    const nameMap = Object.fromEntries(auditUsers.map((u) => [docId(u), u.name]));

    const auditLogs = auditLogsRaw.map((log) => ({
      id: docId(log),
      user_id: log.user_id ? docId(log.user_id) : null,
      user_name: log.user_id ? nameMap[docId(log.user_id)] || null : null,
      action: log.action,
      resource: log.resource,
      status: log.status,
      ip_address: log.ip_address,
      created_at: log.created_at,
      metadata: log.metadata
    }));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const auditSummary = await AuditLog.aggregate([
      { $match: { created_at: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);

    return res.status(200).json({
      summary: { total_students, total_instructors, total_courses, total_sessions, total_attendance },
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
