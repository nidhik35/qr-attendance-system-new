// Instructor session history (JWT protected).
import { connectDB } from "../../../lib/db";
import Session from "../../../lib/models/Session.js";
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

    await connectDB();
    const sessions = await Session.find({ instructor_id: toObjectId(auth.user.id) })
      .sort({ qr_generated_at: -1 })
      .limit(50)
      .lean();

    const sessionIds = sessions.map((s) => s.session_id);
    const counts = await Attendance.aggregate([
      { $match: { session_id: { $in: sessionIds } } },
      { $group: { _id: "$session_id", present_count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.present_count]));

    return res.status(200).json({
      sessions: sessions.map((s) => ({
        session_id: s.session_id,
        course_id: docId(s.course_id),
        course_code: s.course_code,
        course_name: s.course_name,
        is_active: s.is_active,
        created_at: s.created_at,
        qr_generated_at: s.qr_generated_at,
        expires_at: s.expires_at,
        present_count: countMap[s.session_id] || 0
      })),
      total: sessions.length
    });
  } catch (error) {
    console.error("Instructor sessions error:", error);
    return res.status(500).json({ message: "Server error fetching sessions" });
  }
}
