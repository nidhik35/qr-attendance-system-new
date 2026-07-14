import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    device_id: { type: String, default: null },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student"
    },
    department: { type: String, default: null },
    subjects: { type: [String], default: [] },
    face_descriptor: { type: mongoose.Schema.Types.Mixed, default: null },
    last_login_ip: { type: String, default: null },
    token_version: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.User || mongoose.model("User", userSchema, "users");
