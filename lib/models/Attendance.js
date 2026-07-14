import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    student_name: { type: String, default: null },
    instructor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    instructor_name: { type: String, default: null },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    course_code: { type: String, default: null },
    course_name: { type: String, default: null },
    session_id: { type: String, required: true },
    status: { type: String, default: "present", enum: ["present", "absent", "late"] },
    ip_address: { type: String, default: null },
    face_verified: { type: Boolean, default: false },
    liveness_verified: { type: Boolean, default: false },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    date: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Prevent duplicate attendance: only one attendance per student per session
attendanceSchema.index({ student_id: 1, session_id: 1 }, { unique: true });
// Query indexes for performance
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ ip_address: 1, date: -1 });
attendanceSchema.index({ instructor_id: 1, date: -1 });
attendanceSchema.index({ session_id: 1 });
attendanceSchema.index({ course_id: 1, date: -1 });
attendanceSchema.index({ student_id: 1, course_id: 1, instructor_id: 1, date: -1 });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema, "attendance");
