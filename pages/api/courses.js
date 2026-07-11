// API route to list instructor courses (JWT protected).
import db from "../../lib/db";
import { authenticateRequest } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["instructor"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const [courses] = await db.execute(
      `SELECT id, course_code, course_name, classroom_lat, classroom_lng, radius_meters
       FROM courses
       WHERE instructor_id = ?
       ORDER BY course_name ASC`,
      [auth.user.id]
    );

    return res.status(200).json({ courses });
  } catch (error) {
    return res.status(500).json({ message: "Server error while fetching courses" });
  }
}
