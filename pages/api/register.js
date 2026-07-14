// API route for creating a new user account.
import { connectDB } from "../../lib/db";
import User from "../../lib/models/User.js";
import { hashPassword } from "../../lib/auth";
import { validateBody } from "../../lib/validateRequest";
import { registerSchema } from "../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../lib/rateLimit";
import { logAudit } from "../../lib/audit";
import { isDuplicateKeyError, docId } from "../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rl = await rateLimit(req, {
    key: getRateLimitKey(req, "register"),
    max: 5,
    windowMs: 60 * 1000
  });
  if (rl.limited) {
    return res.status(429).json({ message: "Too many registration attempts" });
  }

  try {
    await connectDB();
    const parsed = validateBody(req.body, registerSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json({ message: parsed.error.message, details: parsed.error.details });
    }

    const { name, email, password, role } = parsed.data;
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role
    });

    await logAudit({
      req,
      userId: docId(user),
      action: "register",
      status: "success",
      metadata: { role }
    });

    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Email already registered" });
    }
    return res.status(500).json({ message: "Server error during registration" });
  }
}
