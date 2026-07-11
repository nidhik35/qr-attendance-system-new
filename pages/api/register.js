// API route for creating a new user account.
import db from "../../lib/db";
import { hashPassword } from "../../lib/auth";
import { validateBody } from "../../lib/validateRequest";
import { registerSchema } from "../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../lib/rateLimit";
import { logAudit } from "../../lib/audit";

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
    const parsed = validateBody(req.body, registerSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json({ message: parsed.error.message, details: parsed.error.details });
    }

    const { name, email, password, role } = parsed.data;
    const passwordHash = await hashPassword(password);

    const [result] = await db.execute(
      "INSERT INTO students (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );

    await logAudit({
      req,
      userId: result.insertId,
      action: "register",
      status: "success",
      metadata: { role }
    });

    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered" });
    }
    return res.status(500).json({ message: "Server error during registration" });
  }
}
