// Admin CSV export for attendance records (JWT protected).
import { connectDB } from "../../../lib/db";
import Attendance from "../../../lib/models/Attendance.js";
import User from "../../../lib/models/User.js";
import Course from "../../../lib/models/Course.js";
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
    const rows = await Attendance.find().sort({ date: -1 }).lean();
    
    const studentIds = [...new Set(rows.map((r) => docId(r.student_id)).filter(Boolean))];
    const instructorIds = [...new Set(rows.map((r) => docId(r.instructor_id)).filter(Boolean))];
    const courseIds = [...new Set(rows.map((r) => docId(r.course_id)).filter(Boolean))];

    const [students, instructors, courses] = await Promise.all([
      User.find({ _id: { $in: studentIds.map(toObjectId) } }).select("name email").lean(),
      User.find({ _id: { $in: instructorIds.map(toObjectId) } }).select("name email").lean(),
      Course.find({ _id: { $in: courseIds.map(toObjectId) } }).select("course_code course_name").lean()
    ]);

    const studentMap = Object.fromEntries(students.map((s) => [docId(s), s]));
    const instructorMap = Object.fromEntries(instructors.map((i) => [docId(i), i]));
    const courseMap = Object.fromEntries(courses.map((c) => [docId(c), c]));

    const header = [
      "student_name",
      "student_email",
      "course_code",
      "course_name",
      "instructor_name",
      "session_id",
      "status",
      "face_verified",
      "liveness_verified",
      "date",
      "latitude",
      "longitude",
      "ip_address"
    ];
    const csvLines = [header.join(",")];

    for (const row of rows) {
      const student = studentMap[docId(row.student_id)];
      const instructor = instructorMap[docId(row.instructor_id)];
      const course = courseMap[docId(row.course_id)];
      
      csvLines.push(
        [
          student?.name || row.student_name || "",
          student?.email || "",
          course?.course_code || row.course_code || "",
          course?.course_name || row.course_name || "",
          instructor?.name || row.instructor_name || "",
          row.session_id,
          row.status,
          row.face_verified ? "true" : "false",
          row.liveness_verified ? "true" : "false",
          new Date(row.date).toISOString(),
          row.latitude || "",
          row.longitude || "",
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
