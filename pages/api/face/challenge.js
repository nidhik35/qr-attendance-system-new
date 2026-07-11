// Liveness challenge: issue random blink/pose steps and validate proof.
import { authenticateRequest } from "../../../lib/apiAuth";
import { createLivenessChallenge, completeLivenessChallenge } from "../../../lib/liveness";
import { validateBody } from "../../../lib/validateRequest";
import { faceChallengeCompleteSchema } from "../../../lib/schemas";
import { rateLimit, getRateLimitKey } from "../../../lib/rateLimit";
import { logAudit } from "../../../lib/audit";

export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const rl = await rateLimit(req, {
      key: getRateLimitKey(req, "face:challenge", auth.user.id),
      max: 15,
      windowMs: 60 * 1000
    });
    if (rl.limited) {
      return res.status(429).json({ message: "Too many liveness attempts" });
    }

    if (req.method === "GET" || (req.method === "POST" && !req.body?.proof)) {
      const challenge = await createLivenessChallenge(auth.user.id);
      return res.status(200).json(challenge);
    }
  }

  if (req.method === "POST") {
    const auth = await authenticateRequest(req, ["student"]);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const parsed = validateBody(req.body, faceChallengeCompleteSchema);
    if (parsed.error) {
      return res.status(parsed.error.status).json(parsed.error);
    }

    const result = await completeLivenessChallenge(
      auth.user.id,
      parsed.data.challenge_id,
      parsed.data.proof
    );

    if (result.error) {
      await logAudit({
        req,
        userId: auth.user.id,
        action: "liveness_check",
        status: "failed",
        metadata: { reason: result.reason || result.error }
      });
      return res.status(403).json({ message: result.error, reason: result.reason });
    }

    await logAudit({
      req,
      userId: auth.user.id,
      action: "liveness_check",
      status: "success"
    });

    return res.status(200).json({
      success: true,
      liveness_token: result.livenessToken
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
