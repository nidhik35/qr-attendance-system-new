// API route to list instructor courses (JWT protected).
import { connectDB } from "../../lib/db";
import Course from "../../lib/models/Course.js";
import { authenticateRequest } from "../../lib/apiAuth";
import { toObjectId, docId } from "../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["instructor"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    await connectDB();
    const courses = await Course.find({ 
      instructor_id: toObjectId(auth.user.id),
      is_active: true
    })
      .sort({ course_code: 1 })
      .lean();

    return res.status(200).json({
      courses: courses.map((c) => ({
        id: docId(c),
        course_code: c.course_code,
        course_name: c.course_name,
        semester: c.semester,
        section: c.section,
        classroom_lat: c.classroom_lat,
        classroom_lng: c.classroom_lng,
        radius_meters: c.radius_meters
      }))
    });
  } catch (error) {
    console.error("Courses error:", error);
    return res.status(500).json({ message: "Server error while fetching courses" });
  }
}
