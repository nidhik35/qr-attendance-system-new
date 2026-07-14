import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import User from "../lib/models/User.js";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
}

async function run() {
  loadEnvFile();
  await connectDB();

  const hash = await bcrypt.hash("Admin@123", 10);
  await User.findOneAndUpdate(
    { email: "admin@college.com" },
    {
      $set: {
        name: "System Admin",
        password_hash: hash,
        role: "admin",
        device_id: null
      }
    },
    { upsert: true }
  );

  console.log("Admin account ready: admin@college.com / Admin@123");
  process.exit(0);
}

run().catch((err) => {
  console.error("Admin setup failed:", err.message);
  process.exit(1);
});
