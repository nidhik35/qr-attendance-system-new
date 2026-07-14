// Admin update/delete single instructor (admin only).
import { connectDB } from "../../../../lib/db";
import User from "../../../../lib/models/User.js";
import Course from "../../../../lib/models/Course.js";
import { authenticateRequest } from "../../../../lib/apiAuth";
import { hashPassword } from "../../../../lib/auth";
import { validateBody } from "../../../../lib/validateRequest";
import { instructorUpdateSchema } from "../../../../lib/schemas";
import { syncInstructorCourses } from "../../../../lib/instructorCourses";
import { invalidateUserSessions } from "../../../../lib/refreshToken";
import { logAudit } from "../../../../lib/audit";
import { docId, isDuplicateKeyError, toObjectId } from "../../../../lib/mongo";

export default async function handler(req, res) {
  const auth = await authenticateRequest(req, ["admin"]);
  if (auth.error) {
    return res.status(auth.error.status).json({ message: auth.error.message });
  }

  const { id } = req.query;
  const objectId = toObjectId(id);
  if (!objectId) {
    return res.status(400).json({ message: "Invalid instructor id" });
  }

  try {
    await connectDB();
    const instructor = await User.findOne({ _id: objectId, role: "instructor" });
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        instructor: {
          id: docId(instructor),
          name: instructor.name,
          email: instructor.email,
          department: instructor.department || "",
          subjects: instructor.subjects || []
        }
      });
    }

    if (req.method === "PUT") {
      const parsed = validateBody(req.body, instructorUpdateSchema);
      if (parsed.error) {
        return res.status(parsed.error.status).json(parsed.error);
      }

      const { name, email, password, department, subjects } = parsed.data;
      if (name) instructor.name = name;
      if (email) instructor.email = email.toLowerCase();
      if (department) instructor.department = department;
      if (subjects) instructor.subjects = subjects;
      if (password) instructor.password_hash = await hashPassword(password);

      await instructor.save();

      if (subjects) {
        await syncInstructorCourses(docId(instructor), subjects, instructor.department);
      }

      await invalidateUserSessions(docId(instructor));

      await logAudit({
        req,
        userId: auth.user.id,
        action: "instructor_update",
        resource: docId(instructor),
        status: "success"
      });

      return res.status(200).json({
        message: "Instructor updated successfully",
        instructor: {
          id: docId(instructor),
          name: instructor.name,
          email: instructor.email,
          department: instructor.department,
          subjects: instructor.subjects
        }
      });
    }

    if (req.method === "DELETE") {
      await Course.deleteMany({ instructor_id: objectId });
      await User.deleteOne({ _id: objectId, role: "instructor" });

      await logAudit({
        req,
        userId: auth.user.id,
        action: "instructor_delete",
        resource: String(id),
        status: "success"
      });

      return res.status(200).json({ message: "Instructor deleted successfully" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("Admin instructor detail error:", error);
    return res.status(500).json({ message: "Server error managing instructor" });
  }
}
