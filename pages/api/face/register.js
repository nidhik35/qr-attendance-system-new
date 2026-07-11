// Save student face descriptor for future verification (JWT protected).
import db from "../../../lib/db";
import { authenticateRequest } from "../../../lib/apiAuth";
import { validateBody } from "../../../lib/validateRequest";
import { faceRegisterSchema } from "../../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../../lib/rateLimit";
import { logAudit } from "../../../lib/audit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const rl = await rateLimit(req, {
      key: getRateLimitKey(req, "face:register", auth.user.id),
      max: 5,
      windowMs: 60 * 1000
    });
    if (rl.limited) {
      return res.status(429).json({ message: "Too many face registration attempts" });
    }

    const parsed = validateBody(req.body, faceRegisterSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error);
    }

    await db.execute("UPDATE students SET face_descriptor = ? WHERE id = ?", [
      JSON.stringify(parsed.data.face_descriptor),
      auth.user.id
    ]);

    await logAudit({
      req,
      userId: auth.user.id,
      action: "face_register",
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Face registered successfully"
    });
  } catch (error) {
    console.error("Face register error:", error);
    return res.status(500).json({ message: "Server error while saving face data" });
  }
}
