// Check whether logged-in student has registered face data.
import db from "../../../lib/db";
import { authenticateRequest } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const [rows] = await db.execute(
      "SELECT face_descriptor FROM students WHERE id = ?",
      [auth.user.id]
    );

    const hasFace = Boolean(rows[0]?.face_descriptor);
    return res.status(200).json({ hasFace });
  } catch (error) {
    return res.status(500).json({ message: "Server error while checking face status" });
  }
}
