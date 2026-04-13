// Script to create the database and required attendance tables.
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=");
    process.env[key] = value;
  }
}

async function run() {
  loadEnvFile();

  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "qr_attendance";
  const port = Number(process.env.DB_PORT || 3306);

  const adminConnection = await mysql.createConnection({
    host,
    user,
    password,
    port
  });

  await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await adminConnection.end();

  const dbConnection = await mysql.createConnection({
    host,
    user,
    password,
    database: dbName,
    port
  });

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password_hash TEXT,
      device_id TEXT,
      role VARCHAR(20) NOT NULL DEFAULT 'student' -- Role-based authentication: 'student' or 'instructor'
    )
  `);

  // Role-based authentication: Ensure role column exists for backward compatibility
  const [roleColumnRows] = await dbConnection.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'role'
    `,
    [dbName]
  );

  if (roleColumnRows.length === 0) {
    await dbConnection.query(`
      ALTER TABLE students
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student' -- Role-based authentication: Default role is 'student'
    `);
  }

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id VARCHAR(255) PRIMARY KEY,
      course_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      session_id VARCHAR(255),
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20),
      UNIQUE(student_id, session_id)
    )
  `);

  await dbConnection.end();
  console.log("Database setup completed successfully.");
}

run().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
