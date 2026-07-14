import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    course_code: { type: String, required: true, uppercase: true, trim: true },
    course_name: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    section: { type: String, trim: true, default: "" },
    instructor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classroom_lat: { type: Number, default: 12.9141 },
    classroom_lng: { type: Number, default: 74.856 },
    radius_meters: { type: Number, default: 50 },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Unique index: course_code + instructor_id (each instructor has unique course codes)
courseSchema.index({ course_code: 1, instructor_id: 1 }, { unique: true });
// Query index for finding instructor's courses
courseSchema.index({ instructor_id: 1, is_active: 1 });

export default mongoose.models.Course || mongoose.model("Course", courseSchema, "courses");
