// API route for creating a new user account.
// Role-based registration: the frontend may request student or instructor registration.
import db from "../../lib/db";
import { hashPassword } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, password, role = "student" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["student", "instructor"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be student or instructor." });
    }

    const passwordHash = await hashPassword(password);

    await db.execute(
      "INSERT INTO students (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );

    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered" });
    }
    return res.status(500).json({ message: "Server error during registration" });
  }
}
