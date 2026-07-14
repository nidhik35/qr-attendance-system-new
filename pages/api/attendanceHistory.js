// API route to return attendance history for logged-in student (JWT protected).
import { connectDB } from "../../lib/db";
import Attendance from "../../lib/models/Attendance.js";
import Course from "../../lib/models/Course.js";
import { authenticateRequest } from "../../lib/apiAuth";
import { toObjectId, docId } from "../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    await connectDB();
    const { course_id } = req.query;

    let query = { student_id: toObjectId(auth.user.id) };
    if (course_id) {
      query.course_id = toObjectId(course_id);
    }

    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .lean();

    const attendance = records.map((r) => ({
      id: docId(r),
      session_id: r.session_id,
      course_id: docId(r.course_id),
      course_code: r.course_code,
      course_name: r.course_name,
      instructor_name: r.instructor_name,
      status: r.status,
      face_verified: r.face_verified,
      liveness_verified: r.liveness_verified,
      latitude: r.latitude,
      longitude: r.longitude,
      date: r.date
    }));

    return res.status(200).json({ 
      attendance,
      total: attendance.length 
    });
  } catch (error) {
    console.error("Attendance history error:", error);
    return res.status(500).json({ message: "Server error while fetching attendance history" });
  }
}
