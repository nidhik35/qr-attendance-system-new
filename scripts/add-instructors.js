// Script to create multiple instructor accounts for testing
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

async function addInstructors() {
  loadEnv();
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
  });

  const instructors = [
    { name: "Instructor One", email: "instructor1@gmail.com", password: "Instructor@123" },
    { name: "Instructor Two", email: "instructor2@gmail.com", password: "Instructor@123" },
    { name: "Instructor Three", email: "instructor3@gmail.com", password: "Instructor@123" },
    { name: "Nidhi", email: "nidhi@gmail.com", password: "Instructor@123" }
  ];

  console.log("Creating instructor accounts...\n");

  for (const inst of instructors) {
    const hash = await bcrypt.hash(inst.password, 10);
    await conn.execute(
      "INSERT INTO students (name, email, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role)",
      [inst.name, inst.email, hash, "instructor"]
    );
    console.log(`✅ Created/Updated: ${inst.email} / ${inst.password}`);
  }

  await conn.end();
  console.log("\n✅ All instructor accounts ready!");
}

addInstructors().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
