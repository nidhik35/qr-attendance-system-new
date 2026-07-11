const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

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
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
  });

  const hash = await bcrypt.hash("Admin@123", 10);
  await conn.execute(
    `INSERT INTO students (name, email, password_hash, role, device_id)
     VALUES (?, ?, ?, 'admin', NULL)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = 'admin',
       device_id = NULL`,
    ["System Admin", "admin@college.com", hash]
  );

  await conn.end();
  console.log("Admin account ready: admin@college.com / Admin@123");
}

run().catch((err) => {
  console.error("Admin setup failed:", err.message);
  process.exit(1);
});
