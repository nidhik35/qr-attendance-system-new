// Check whether logged-in student has registered face data.
import { connectDB } from "../../../lib/db";
import User from "../../../lib/models/User.js";
import { authenticateRequest } from "../../../lib/apiAuth";
import { toObjectId } from "../../../lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    await connectDB();
    const user = await User.findById(toObjectId(auth.user.id)).select("face_descriptor").lean();
    const hasFace = Boolean(user?.face_descriptor);

    return res.status(200).json({ hasFace });
  } catch (error) {
    return res.status(500).json({ message: "Server error while checking face status" });
  }
}
