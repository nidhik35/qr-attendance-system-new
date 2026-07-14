// API route for role-based login with device binding and JWT token pair.
import { connectDB } from "../../lib/db";
import User from "../../lib/models/User.js";
import { comparePassword } from "../../lib/auth";
import { getDeviceId } from "../../lib/device";
import { getClientIp } from "../../lib/apiAuth";
import { issueTokenPair, setRefreshCookie } from "../../lib/refreshToken";
import { validateBody } from "../../lib/validateRequest";
import { loginSchema } from "../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../lib/rateLimit";
import { logAudit } from "../../lib/audit";
import { docId } from "../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rl = await rateLimit(req, {
    key: getRateLimitKey(req, "login"),
    max: 10,
    windowMs: 60 * 1000
  });
  if (rl.limited) {
    return res.status(429).json({ message: "Too many login attempts. Try again shortly." });
  }

  try {
    await connectDB();
    const parsed = validateBody(req.body, loginSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json({ success: false, message: parsed.error.message, details: parsed.error.details });
    }

    const { email, password, role, device_id, loginType } = parsed.data;
    const isInstructorLogin = loginType === "instructor";
    const isAdminLogin = loginType === "admin";

    if (!isInstructorLogin && !isAdminLogin && !role) {
      return res.status(400).json({
        success: false,
        message: "Login role is required for student login"
      });
    }

    const query = { email: email.toLowerCase() };
    if (isAdminLogin) {
      query.role = "admin";
    } else if (isInstructorLogin) {
      query.role = "instructor";
    } else {
      query.role = role;
    }

    const user = await User.findOne(query).lean();

    if (!user) {
      await logAudit({ req, action: "login", status: "failed", metadata: { email, reason: "not_found" } });
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or role mismatch"
      });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      await logAudit({ req, userId: docId(user), action: "login", status: "failed", metadata: { reason: "bad_password" } });
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const safeDeviceId = device_id || "unknown-device";
    const normalizedDeviceId = getDeviceId(safeDeviceId);
    if (!user.device_id) {
      await User.updateOne({ _id: user._id }, { device_id: normalizedDeviceId });
    } else if (user.device_id !== normalizedDeviceId) {
      await logAudit({
        req,
        userId: docId(user),
        action: "login",
        status: "flagged",
        metadata: { reason: "device_mismatch" }
      });
      return res.status(403).json({
        success: false,
        message: "Device mismatch. Login rejected."
      });
    }

    const clientIp = getClientIp(req);
    await User.updateOne({ _id: user._id }, { last_login_ip: clientIp });

    const userPayload = {
      id: docId(user),
      name: user.name,
      email: user.email,
      role: user.role,
      token_version: user.token_version ?? 0
    };

    const tokens = await issueTokenPair(userPayload, normalizedDeviceId);
    setRefreshCookie(res, tokens.refreshToken);

    await logAudit({ req, userId: userPayload.id, action: "login", status: "success", metadata: { role: user.role } });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken: tokens.accessToken,
      userId: userPayload.id,
      role: user.role,
      user: {
        id: userPayload.id,
        name: userPayload.name,
        email: userPayload.email,
        role: userPayload.role
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
