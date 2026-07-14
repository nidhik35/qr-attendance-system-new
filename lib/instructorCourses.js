// Sync Course records when admin assigns subjects to an instructor.
import Course from "./models/Course.js";
import { toObjectId } from "./mongo";

export function subjectToCourseCode(subject) {
  return String(subject).trim().toUpperCase().replace(/\s+/g, "_");
}

export async function syncInstructorCourses(instructorId, subjects = [], department = null) {
  const oid = toObjectId(instructorId);
  const normalizedSubjects = [...new Set(subjects.map((s) => String(s).trim()).filter(Boolean))];
  const desiredCodes = normalizedSubjects.map(subjectToCourseCode);

  const existing = await Course.find({ instructor_id: oid }).lean();
  const existingCodes = existing.map((c) => c.course_code);

  const toRemove = existingCodes.filter((code) => !desiredCodes.includes(code));
  if (toRemove.length > 0) {
    await Course.deleteMany({ instructor_id: oid, course_code: { $in: toRemove } });
  }

  for (const subject of normalizedSubjects) {
    const courseCode = subjectToCourseCode(subject);
    const lat = Number(process.env.CLASSROOM_LAT || 12.9141);
    const lng = Number(process.env.CLASSROOM_LNG || 74.856);
    const radius = Number(process.env.CLASSROOM_RADIUS_METERS || 50);

    await Course.findOneAndUpdate(
      { course_code: courseCode, instructor_id: oid },
      {
        $set: {
          course_name: subject,
          classroom_lat: lat,
          classroom_lng: lng,
          radius_meters: radius
        },
        $setOnInsert: {
          course_code: courseCode,
          instructor_id: oid
        }
      },
      { upsert: true, new: true }
    );
  }

  return normalizedSubjects;
}
