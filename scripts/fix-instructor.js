// Script to create or update instructor account.
// Role-based authentication: Sets role to 'instructor' for admin account creation.
// This script should be used by administrators to create instructor accounts.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

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
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
  });

  const hash = await bcrypt.hash("Instructor@123", 10);

  // Role-based authentication: Create instructor account with 'instructor' role
  await conn.execute(
    `INSERT INTO students (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = VALUES(role), -- Role-based authentication: Ensure role remains 'instructor'
       device_id = NULL`,
    ["Instructor", "instructor@gmail.com", hash, "instructor"]
  );

  const [rows] = await conn.execute(
    "SELECT id FROM students WHERE email = 'instructor@gmail.com' LIMIT 1"
  );
  if (rows.length > 0) {
    const instructorId = rows[0].id;
    const lat = process.env.CLASSROOM_LAT || "12.9141";
    const lng = process.env.CLASSROOM_LNG || "74.8560";
    await conn.execute(
      `INSERT IGNORE INTO courses (course_code, course_name, instructor_id, classroom_lat, classroom_lng, radius_meters)
       VALUES ('CSE101', 'Computer Networks', ?, ?, ?, 50)`,
      [instructorId, lat, lng]
    );
  }

  await conn.end();
  console.log("Instructor account created/updated successfully with role-based authentication.");
}

run().catch((err) => {
  console.error("Fix failed:", err.message);
  process.exit(1);
});
