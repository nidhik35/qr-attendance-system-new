import { connectDB } from "../../../lib/db";
import Course from "../../../lib/models/Course.js";
import { authenticateRequest } from "../../../lib/apiAuth";
import { docId } from "../../../lib/mongo";
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

    // Get all active courses from all instructors
    const courses = await Course.find({ is_active: true })
      .select("_id course_code course_name instructor_id")
      .populate({ path: "instructor_id", select: "name" })
      .sort({ course_code: 1 })
      .lean();

    const formattedCourses = courses.map((c) => ({
      id: docId(c),
      course_code: c.course_code,
      course_name: c.course_name,
      instructor: c.instructor_id ? {
        id: docId(c.instructor_id),
        name: c.instructor_id.name
      } : null
    }));

    return res.status(200).json({
      courses: formattedCourses,
      total: formattedCourses.length
    });
  } catch (error) {
    console.error("Student courses error:", error);
    return res.status(500).json({ message: "Server error while fetching courses" });
  }
}
