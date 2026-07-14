import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import User from "../lib/models/User.js";
import Course from "../lib/models/Course.js";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
  }
}

async function run() {
  loadEnv();
  await connectDB();

  const hash = await bcrypt.hash("Instructor@123", 10);

  let instructor = await User.findOneAndUpdate(
    { email: "instructor@gmail.com" },
    {
      $set: {
        name: "Instructor",
        password_hash: hash,
        role: "instructor",
        device_id: null
      }
    },
    { upsert: true, new: true }
  );

  const lat = Number(process.env.CLASSROOM_LAT || 12.9141);
  const lng = Number(process.env.CLASSROOM_LNG || 74.856);
  await Course.updateOne(
    { course_code: "CSE101" },
    {
      $set: {
        course_name: "Computer Networks",
        instructor_id: instructor._id,
        classroom_lat: lat,
        classroom_lng: lng,
        radius_meters: 50
      },
      $setOnInsert: { course_code: "CSE101" }
    },
    { upsert: true }
  );

  console.log("Instructor account created/updated successfully.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Fix failed:", err.message);
  process.exit(1);
});
