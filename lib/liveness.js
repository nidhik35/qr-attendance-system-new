// Server-side liveness challenge generation and proof validation.
import { v4 as uuidv4 } from "uuid";
import db from "./db";
import { signLivenessToken } from "./jwt";
import { validateLivenessProof } from "./livenessValidate.js";

export { validateLivenessProof, MIN_STEP_MS } from "./livenessValidate.js";

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const STEP_POOL = ["blink", "turn_left", "turn_right"];

export function generateLivenessSteps(count = 2) {
  const shuffled = [...STEP_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function createLivenessChallenge(userId) {
  const challengeId = uuidv4();
  const steps = generateLivenessSteps(2);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await db.execute(
    `INSERT INTO liveness_challenges (challenge_id, user_id, steps, expires_at)
     VALUES (?, ?, ?, ?)`,
    [challengeId, userId, JSON.stringify(steps), expiresAt]
  );

  return { challengeId, steps, expiresAt: expiresAt.toISOString() };
}

export async function completeLivenessChallenge(userId, challengeId, proof) {
  const [rows] = await db.execute(
    `SELECT challenge_id, user_id, steps, expires_at, used_at
     FROM liveness_challenges
     WHERE challenge_id = ? AND user_id = ?`,
    [challengeId, userId]
  );

  if (rows.length === 0) {
    return { error: "Challenge not found" };
  }

  const row = rows[0];
  if (row.used_at) {
    return { error: "Challenge already used" };
  }
  if (new Date(row.expires_at) < new Date()) {
    return { error: "Challenge expired" };
  }

  const steps = JSON.parse(row.steps);
  const validation = validateLivenessProof(steps, proof);
  if (!validation.valid) {
    return { error: "Liveness proof rejected", reason: validation.reason };
  }

  await db.execute(
    "UPDATE liveness_challenges SET used_at = NOW() WHERE challenge_id = ?",
    [challengeId]
  );

  const livenessToken = signLivenessToken({
    userId,
    challengeId
  });

  return { livenessToken };
}

export { CHALLENGE_TTL_MS };
