// Seed MongoDB collections and indexes for the QR attendance system.
import fs from "fs";
import path from "path";
import { connectDB } from "../lib/db.js";
import User from "../lib/models/User.js";
import Course from "../lib/models/Course.js";
import Session from "../lib/models/Session.js";
import Attendance from "../lib/models/Attendance.js";
import RefreshToken from "../lib/models/RefreshToken.js";
import AuditLog from "../lib/models/AuditLog.js";
import RateLimit from "../lib/models/RateLimit.js";
import LivenessChallenge from "../lib/models/LivenessChallenge.js";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    process.env[key] = rest.join("=");
  }
}

async function ensureIndexes() {
  await Promise.all([
    User.init(),
    Course.init(),
    Session.init(),
    Attendance.init(),
    RefreshToken.init(),
    AuditLog.init(),
    RateLimit.init(),
    LivenessChallenge.init()
  ]);
}

async function run() {
  loadEnvFile();
  await connectDB();
  await ensureIndexes();

  const instructor = await User.findOne({ role: "instructor" }).sort({ created_at: 1 });
  if (instructor) {
    const lat = Number(process.env.CLASSROOM_LAT || 12.9141);
    const lng = Number(process.env.CLASSROOM_LNG || 74.856);
    await Course.updateOne(
      { course_code: "CSE101" },
      {
        $setOnInsert: {
          course_code: "CSE101",
          course_name: "Computer Networks",
          instructor_id: instructor._id,
          classroom_lat: lat,
          classroom_lng: lng,
          radius_meters: 50
        }
      },
      { upsert: true }
    );
  }

  console.log("MongoDB setup completed successfully.");
  process.exit(0);
}

run().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
