// Admin CRUD for instructor accounts (admin only).
import { connectDB } from "../../../../lib/db";
import User from "../../../../lib/models/User.js";
import Course from "../../../../lib/models/Course.js";
import { authenticateRequest } from "../../../../lib/apiAuth";
import { hashPassword } from "../../../../lib/auth";
import { validateBody } from "../../../../lib/validateRequest";
import { instructorCreateSchema, instructorUpdateSchema } from "../../../../lib/schemas";
import { syncInstructorCourses } from "../../../../lib/instructorCourses";
import { logAudit } from "../../../../lib/audit";
import { docId, isDuplicateKeyError, toObjectId } from "../../../../lib/mongo";

export default async function handler(req, res) {
  const auth = await authenticateRequest(req, ["admin"]);
  if (auth.error) {
    return res.status(auth.error.status).json({ message: auth.error.message });
  }

  try {
    await connectDB();

    if (req.method === "GET") {
      // List all instructors
      const instructors = await User.find({ role: "instructor" })
        .select("name email department subjects created_at")
        .sort({ created_at: -1 })
        .lean();

      return res.status(200).json({
        instructors: instructors.map((i) => ({
          id: docId(i),
          name: i.name,
          email: i.email,
          department: i.department || "",
          subjects: i.subjects || [],
          created_at: i.created_at
        })),
        total: instructors.length
      });
    }

    if (req.method === "POST") {
      // Create new instructor
      const parsed = validateBody(req.body, instructorCreateSchema);
      if (parsed.error) {
        return res.status(parsed.error.status).json(parsed.error);
      }

      const { name, email, password, department, subjects } = parsed.data;
      const passwordHash = await hashPassword(password);

      try {
        const instructor = await User.create({
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: "instructor",
          department,
          subjects
        });

        // Create courses for the instructor
        await syncInstructorCourses(docId(instructor), subjects, department);

        await logAudit({
          req,
          userId: auth.user.id,
          action: "instructor_create",
          resource: docId(instructor),
          status: "success",
          metadata: { email, department, subjects }
        });

        return res.status(201).json({
          message: "Instructor created successfully",
          instructor: {
            id: docId(instructor),
            name: instructor.name,
            email: instructor.email,
            department,
            subjects
          }
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return res.status(409).json({ message: "Email already registered" });
        }
        throw error;
      }
    }

    if (req.method === "PUT") {
      // Update instructor
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ message: "Instructor ID required" });
      }

      const parsed = validateBody(req.body, instructorUpdateSchema);
      if (parsed.error) {
        return res.status(parsed.error.status).json(parsed.error);
      }

      const instructorId = toObjectId(id);
      const instructor = await User.findOne({ _id: instructorId, role: "instructor" });

      if (!instructor) {
        return res.status(404).json({ message: "Instructor not found" });
      }

      // Update fields
      if (parsed.data.name) instructor.name = parsed.data.name;
      if (parsed.data.department) instructor.department = parsed.data.department;
      if (parsed.data.subjects) instructor.subjects = parsed.data.subjects;
      if (parsed.data.email) instructor.email = parsed.data.email.toLowerCase();
      if (parsed.data.password) instructor.password_hash = await hashPassword(parsed.data.password);

      await instructor.save();

      // Sync courses if subjects changed
      if (parsed.data.subjects) {
        await syncInstructorCourses(id, parsed.data.subjects, instructor.department);
      }

      await logAudit({
        req,
        userId: auth.user.id,
        action: "instructor_update",
        resource: id,
        status: "success",
        metadata: { email: instructor.email }
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
      // Delete instructor and their courses
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ message: "Instructor ID required" });
      }

      const instructorId = toObjectId(id);
      const instructor = await User.findOne({ _id: instructorId, role: "instructor" });

      if (!instructor) {
        return res.status(404).json({ message: "Instructor not found" });
      }

      // Delete instructor's courses
      await Course.deleteMany({ instructor_id: instructorId });

      // Delete instructor
      await User.deleteOne({ _id: instructorId });

      await logAudit({
        req,
        userId: auth.user.id,
        action: "instructor_delete",
        resource: id,
        status: "success",
        metadata: { email: instructor.email }
      });

      return res.status(200).json({ message: "Instructor deleted successfully" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Admin instructors error:", error);
    return res.status(500).json({ message: "Server error managing instructors" });
  }
}
