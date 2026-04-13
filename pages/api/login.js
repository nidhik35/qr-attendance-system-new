// API route for role-based login with device binding.
// Role-based authentication: Validates user credentials and role before allowing access.
// Accepts role parameter to ensure user is logging in with correct role.
import db from "../../lib/db";
import { comparePassword } from "../../lib/auth";
import { getDeviceId } from "../../lib/device";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password, role, device_id, loginType } = req.body;
    const isInstructorLogin = loginType === "instructor";

    // Validate required fields
    if (!email || !password || !device_id) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and device_id are required"
      });
    }

    if (!isInstructorLogin) {
      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Login role is required for student login"
        });
      }
      if (!['student', 'instructor'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be 'student' or 'instructor'"
        });
      }
    }

    // Find user by email. Instructor login accepts any registered user.
    let query = "SELECT id, name, email, password_hash, device_id, role FROM students WHERE email = ?";
    const params = [email];
    if (!isInstructorLogin) {
      query += " AND role = ?";
      params.push(role);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or role mismatch"
      });
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Handle device binding
    const normalizedDeviceId = getDeviceId(device_id);
    if (!user.device_id) {
      // First login - bind device
      await db.execute("UPDATE students SET device_id = ? WHERE id = ?", [
        normalizedDeviceId,
        user.id
      ]);
    } else if (user.device_id !== normalizedDeviceId) {
      return res.status(403).json({
        success: false,
        message: "Device mismatch. Login rejected."
      });
    }

    const sessionRole = isInstructorLogin ? "instructor" : user.role;

    // Return success with user data and session role info
    return res.status(200).json({
      success: true,
      userId: user.id,
      role: user.role,
      sessionRole,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
}
