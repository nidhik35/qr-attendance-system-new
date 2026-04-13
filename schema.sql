-- Database schema for the Secure QR Code Attendance System.
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash TEXT,
  device_id TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'student' -- Role-based authentication: 'student' or 'instructor'
);

CREATE TABLE sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  course_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  session_id VARCHAR(255),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20),
  UNIQUE(student_id, session_id)
);
