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
    CREATE TABLE IF NOT EXISTS courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_code VARCHAR(50) UNIQUE NOT NULL,
      course_name VARCHAR(100) NOT NULL,
      instructor_id INT,
      classroom_lat DECIMAL(10,7),
      classroom_lng DECIMAL(10,7),
      radius_meters INT DEFAULT 50
    )
  `);

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      session_id VARCHAR(255),
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20),
      ip_address VARCHAR(45),
      UNIQUE(student_id, session_id)
    )
  `);

  const addColumnIfMissing = async (table, column, definition) => {
    const [rows] = await dbConnection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column]
    );
    if (rows.length === 0) {
      await dbConnection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  await addColumnIfMissing("students", "last_login_ip", "VARCHAR(45)");
  await addColumnIfMissing("students", "face_descriptor", "LONGTEXT");
  await addColumnIfMissing("students", "token_version", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("attendance", "ip_address", "VARCHAR(45)");
  await addColumnIfMissing("sessions", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      jti VARCHAR(36) NOT NULL,
      device_id TEXT,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_hash (token_hash)
    )
  `);

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(50) NOT NULL,
      resource VARCHAR(255) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'success',
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_action (action),
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    )
  `);

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rate_key VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_key_time (rate_key, created_at)
    )
  `);

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS liveness_challenges (
      challenge_id VARCHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      steps JSON NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id)
    )
  `);

  // Seed default course for first instructor if available.
  const [instructors] = await dbConnection.query(
    "SELECT id FROM students WHERE role = 'instructor' ORDER BY id ASC LIMIT 1"
  );
  if (instructors.length > 0) {
    const instructorId = instructors[0].id;
    const lat = process.env.CLASSROOM_LAT || "12.9141";
    const lng = process.env.CLASSROOM_LNG || "74.8560";
    await dbConnection.query(
      `INSERT IGNORE INTO courses (course_code, course_name, instructor_id, classroom_lat, classroom_lng, radius_meters)
       VALUES ('CSE101', 'Computer Networks', ?, ?, ?, 50)`,
      [instructorId, lat, lng]
    );
  }

  await dbConnection.end();
  console.log("Database setup completed successfully.");
}

run().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
