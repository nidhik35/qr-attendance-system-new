import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, unique: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    course_code: { type: String, default: null },
    course_name: { type: String, default: null },
    instructor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    instructor_name: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    expires_at: { type: Date, default: null },
    qr_generated_at: { type: Date, default: () => new Date() }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Query indexes
sessionSchema.index({ instructor_id: 1, created_at: -1 });
sessionSchema.index({ course_id: 1, is_active: 1 });
sessionSchema.index({ session_id: 1 });
sessionSchema.index({ is_active: 1, qr_generated_at: -1 });

export default mongoose.models.Session || mongoose.model("Session", sessionSchema, "sessions");
