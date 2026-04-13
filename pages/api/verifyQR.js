// API route to verify scanned QR data and mark attendance.
// Role-based authentication: Only users with 'student' role can mark attendance.
import db from "../../lib/db";
import { getDeviceId } from "../../lib/device";
import { isQRExpired } from "../../lib/qr";

// Simple in-memory throttling to prevent rapid repeated submissions.
const REQUEST_THROTTLE_MS = 5000;
const lastRequestByStudent = new Map();

// Fixed classroom location used for attendance geo-validation.
const CLASSROOM_LAT = Number(process.env.CLASSROOM_LAT || 12.9716);
const CLASSROOM_LNG = Number(process.env.CLASSROOM_LNG || 77.5946);
const CLASSROOM_RADIUS_METERS = 50;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { session_id, timestamp, student_id, device_id, latitude, longitude } = req.body;

    if (!session_id || !timestamp || !student_id || !device_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const studentKey = String(student_id);
    const now = Date.now();
    const lastTime = lastRequestByStudent.get(studentKey) || 0;
    if (now - lastTime < REQUEST_THROTTLE_MS) {
      return res.status(429).json({ message: "Please wait before scanning again." });
    }
    lastRequestByStudent.set(studentKey, now);

    const [sessions] = await db.execute("SELECT session_id, created_at FROM sessions WHERE session_id = ?", [
      session_id
    ]);
    if (sessions.length === 0) {
      return res.status(400).json({ message: "Invalid session" });
    }

    // Only latest generated QR session is valid.
    const [latestSessionRows] = await db.execute(
      "SELECT session_id FROM sessions ORDER BY created_at DESC LIMIT 1"
    );
    if (latestSessionRows.length === 0 || latestSessionRows[0].session_id !== session_id) {
      return res.status(400).json({ message: "Invalid session" });
    }

    if (isQRExpired(timestamp)) {
      return res.status(400).json({ message: "QR expired" });
    }

    // Role-based authentication: Verify student role
    const [students] = await db.execute("SELECT device_id, role FROM students WHERE id = ?", [student_id]);
    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (students[0].role !== "student") {
      return res.status(403).json({ message: "Only students can mark attendance." });
    }

    const normalizedDeviceId = getDeviceId(device_id);
    if (students[0].device_id !== normalizedDeviceId) {
      return res.status(403).json({ message: "Device mismatch. Attendance rejected." });
    }

    const studentLat = Number(latitude);
    const studentLng = Number(longitude);
    if (Number.isNaN(studentLat) || Number.isNaN(studentLng)) {
      return res.status(400).json({ message: "Invalid location data" });
    }

    const distance = getDistanceMeters(studentLat, studentLng, CLASSROOM_LAT, CLASSROOM_LNG);
    if (distance > CLASSROOM_RADIUS_METERS) {
      return res.status(403).json({ message: "You are not in classroom" });
    }

    try {
      await db.execute(
        "INSERT INTO attendance (student_id, session_id, status) VALUES (?, ?, ?)",
        [student_id, session_id, "present"]
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Attendance already marked" });
      }
      throw error;
    }

    return res.status(200).json({ message: "Attendance marked successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error during attendance verification" });
  }
}
