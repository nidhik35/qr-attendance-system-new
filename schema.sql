-- Database schema for the Secure QR Code Attendance System.
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash TEXT,
  device_id TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  face_descriptor LONGTEXT,
  last_login_ip VARCHAR(45),
  token_version INT NOT NULL DEFAULT 0
);

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(50) UNIQUE NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  instructor_id INT,
  classroom_lat DECIMAL(10,7),
  classroom_lng DECIMAL(10,7),
  radius_meters INT DEFAULT 50
);

CREATE TABLE sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  course_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  session_id VARCHAR(255),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20),
  ip_address VARCHAR(45),
  UNIQUE(student_id, session_id)
);

CREATE TABLE refresh_tokens (
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
);

CREATE TABLE audit_logs (
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
);

CREATE TABLE rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rate_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_key_time (rate_key, created_at)
);

CREATE TABLE liveness_challenges (
  challenge_id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  steps JSON NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
);
