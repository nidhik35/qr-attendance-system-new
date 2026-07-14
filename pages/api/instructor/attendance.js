// Instructor attendance list for a session (JWT protected).
import { connectDB } from "../../../lib/db";
import Session from "../../../lib/models/Session.js";
import Course from "../../../lib/models/Course.js";
import Attendance from "../../../lib/models/Attendance.js";
import { authenticateRequest } from "../../../lib/apiAuth";
import { toObjectId, docId } from "../../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["instructor"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const { session_id, course_id } = req.query;
    const instructorId = toObjectId(auth.user.id);

    await connectDB();

    if (session_id) {
      // Fetch attendance for a specific session
      const session = await Session.findOne({
        session_id,
        instructor_id: instructorId
      }).lean();

      if (!session) {
        return res.status(404).json({ message: "Session not found or not authorized" });
      }

      const records = await Attendance.find({ session_id })
        .sort({ date: -1 })
        .lean();

      return res.status(200).json({
        session: {
          session_id: session.session_id,
          course_id: docId(session.course_id),
          course_code: session.course_code,
          course_name: session.course_name,
          is_active: session.is_active,
          created_at: session.created_at
        },
        attendance: records.map((r) => ({
          id: docId(r),
          student_id: docId(r.student_id),
          student_name: r.student_name,
          course_code: r.course_code,
          status: r.status,
          face_verified: r.face_verified,
          liveness_verified: r.liveness_verified,
          latitude: r.latitude,
          longitude: r.longitude,
          date: r.date
        })),
        total: records.length
      });
    }

    if (course_id) {
      // Fetch all attendance for a course
      const course = await Course.findOne({
        _id: toObjectId(course_id),
        instructor_id: instructorId
      }).lean();

      if (!course) {
        return res.status(404).json({ message: "Course not found or not authorized" });
      }

      const sessions = await Session.find({ course_id: course._id }).select("session_id").lean();
      const sessionIds = sessions.map((s) => s.session_id);

      const records = await Attendance.find({ session_id: { $in: sessionIds } })
        .sort({ date: -1 })
        .lean();

      return res.status(200).json({
        course: {
          id: docId(course),
          course_code: course.course_code,
          course_name: course.course_name
        },
        attendance: records.map((r) => ({
          id: docId(r),
          session_id: r.session_id,
          student_id: docId(r.student_id),
          student_name: r.student_name,
          status: r.status,
          face_verified: r.face_verified,
          liveness_verified: r.liveness_verified,
          date: r.date
        })),
        total: records.length
      });
    }

    // No filters - return error
    return res.status(400).json({ message: "session_id or course_id query param required" });
  } catch (error) {
    console.error("Instructor attendance error:", error);
    return res.status(500).json({ message: "Server error fetching attendance" });
  }
}
