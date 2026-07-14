import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import User from "../lib/models/User.js";

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

async function addInstructors() {
  loadEnv();
  await connectDB();

  const instructors = [
    { name: "Instructor One", email: "instructor1@gmail.com", password: "Instructor@123" },
    { name: "Instructor Two", email: "instructor2@gmail.com", password: "Instructor@123" },
    { name: "Instructor Three", email: "instructor3@gmail.com", password: "Instructor@123" },
    { name: "Nidhi", email: "nidhi@gmail.com", password: "Instructor@123" }
  ];

  console.log("Creating instructor accounts...\n");

  for (const inst of instructors) {
    const hash = await bcrypt.hash(inst.password, 10);
    await User.findOneAndUpdate(
      { email: inst.email },
      {
        $set: {
          name: inst.name,
          password_hash: hash,
          role: "instructor"
        }
      },
      { upsert: true }
    );
    console.log(`Created/Updated: ${inst.email} / ${inst.password}`);
  }

  console.log("\nAll instructor accounts ready!");
  process.exit(0);
}

addInstructors().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
