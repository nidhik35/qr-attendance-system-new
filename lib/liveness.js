// Server-side liveness challenge generation and proof validation.
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "./db";
import LivenessChallenge from "./models/LivenessChallenge.js";
import { signLivenessToken } from "./jwt";
import { validateLivenessProof } from "./livenessValidate.js";
import { toObjectId } from "./mongo";

export { validateLivenessProof, MIN_STEP_MS } from "./livenessValidate.js";

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const STEP_POOL = ["blink", "turn_left", "turn_right"];

export function generateLivenessSteps(count = 2) {
  const shuffled = [...STEP_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function createLivenessChallenge(userId) {
  await connectDB();
  const challengeId = uuidv4();
  const steps = generateLivenessSteps(2);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await LivenessChallenge.create({
    challenge_id: challengeId,
    user_id: toObjectId(userId),
    steps,
    expires_at: expiresAt
  });

  return { challengeId, steps, expiresAt: expiresAt.toISOString() };
}

export async function completeLivenessChallenge(userId, challengeId, proof) {
  await connectDB();
  const row = await LivenessChallenge.findOne({
    challenge_id: challengeId,
    user_id: toObjectId(userId)
  }).lean();

  if (!row) {
    return { error: "Challenge not found" };
  }
  if (row.used_at) {
    return { error: "Challenge already used" };
  }
  if (new Date(row.expires_at) < new Date()) {
    return { error: "Challenge expired" };
  }

  const validation = validateLivenessProof(row.steps, proof);
  if (!validation.valid) {
    return { error: "Liveness proof rejected", reason: validation.reason };
  }

  await LivenessChallenge.updateOne({ challenge_id: challengeId }, { used_at: new Date() });

  const livenessToken = signLivenessToken({
    userId,
    challengeId
  });

  return { livenessToken };
}

export { CHALLENGE_TTL_MS };
