// API route for instructors to create and manage their courses (JWT protected).
import { connectDB } from "../../../lib/db";
import Course from "../../../lib/models/Course.js";
import { authenticateRequest } from "../../../lib/apiAuth";
import { validateBody } from "../../../lib/validateRequest";
import { z } from "zod";
import { rateLimit, getRateLimitKey } from "../../../lib/rateLimit";
import { logAudit } from "../../../lib/audit";
import { toObjectId, isDuplicateKeyError, docId } from "../../../lib/mongo";

const createCourseSchema = z.object({
  course_code: z.string().min(1).max(50).toUpperCase(),
  course_name: z.string().min(1).max(200),
  semester: z.string().min(1).max(20),
  section: z.string().max(50).optional().default(""),
  classroom_lat: z.number().default(12.9141),
  classroom_lng: z.number().default(74.856),
  radius_meters: z.number().default(50)
});

const updateCourseSchema = z.object({
  course_name: z.string().min(1).max(200).optional(),
  classroom_lat: z.number().optional(),
  classroom_lng: z.number().optional(),
  radius_meters: z.number().optional(),
  is_active: z.boolean().optional()
});

export default async function handler(req, res) {
  try {
    const auth = await authenticateRequest(req, ["instructor"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    await connectDB();
    const instructorId = toObjectId(auth.user.id);

    if (req.method === "GET") {
      // Fetch instructor's courses
      const courses = await Course.find({ instructor_id: instructorId })
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
          radius_meters: c.radius_meters,
          is_active: c.is_active,
          created_at: c.created_at
        }))
      });
    }

    if (req.method === "POST") {
      // Create new course
      const rl = await rateLimit(req, {
        key: getRateLimitKey(req, "createCourse", auth.user.id),
        max: 10,
        windowMs: 60 * 1000
      });
      if (rl.limited) {
        return res.status(429).json({ message: "Too many course creation requests" });
      }

      const parsed = validateBody(req.body, createCourseSchema);
      if (parsed.error) {
        return res.status(parsed.error.status).json(parsed.error);
      }

      const { course_code, course_name, semester, section, classroom_lat, classroom_lng, radius_meters } = parsed.data;

      try {
        const course = await Course.create({
          course_code,
          course_name,
          semester,
          section,
          instructor_id: instructorId,
          classroom_lat,
          classroom_lng,
          radius_meters,
          is_active: true
        });

        await logAudit({
          req,
          userId: auth.user.id,
          action: "course_create",
          resource: docId(course),
          status: "success",
          metadata: { course_code, course_name, semester }
        });

        return res.status(201).json({
          message: "Course created successfully",
          course: {
            id: docId(course),
            course_code: course.course_code,
            course_name: course.course_name,
            semester: course.semester,
            section: course.section,
            classroom_lat: course.classroom_lat,
            classroom_lng: course.classroom_lng,
            radius_meters: course.radius_meters,
            is_active: course.is_active
          }
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return res.status(409).json({ message: "You already have a course with this code" });
        }
        throw error;
      }
    }

    if (req.method === "PUT") {
      // Update course
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ message: "Course ID required" });
      }

      const parsed = validateBody(req.body, updateCourseSchema);
      if (parsed.error) {
        return res.status(parsed.error.status).json(parsed.error);
      }

      const course = await Course.findOne({
        _id: toObjectId(id),
        instructor_id: instructorId
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found or not authorized" });
      }

      Object.assign(course, parsed.data);
      await course.save();

      await logAudit({
        req,
        userId: auth.user.id,
        action: "course_update",
        resource: id,
        status: "success",
        metadata: { course_code: course.course_code }
      });

      return res.status(200).json({
        message: "Course updated successfully",
        course: {
          id: docId(course),
          course_code: course.course_code,
          course_name: course.course_name,
          semester: course.semester,
          section: course.section,
          classroom_lat: course.classroom_lat,
          classroom_lng: course.classroom_lng,
          radius_meters: course.radius_meters,
          is_active: course.is_active
        }
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Instructor courses error:", error);
    return res.status(500).json({ message: "Server error managing courses" });
  }
}
