// Server-side liveness challenge generation.
// Simple demo version: Blink once.

import { v4 as uuidv4 } from "uuid";
import { connectDB } from "./db";
import LivenessChallenge from "./models/LivenessChallenge.js";
import { signLivenessToken } from "./jwt";
import { toObjectId } from "./mongo";

const CHALLENGE_TTL_MS = 2 * 60 * 1000;

// Only one liveness step
export function generateLivenessSteps() {
  return ["blink"];
}

export async function createLivenessChallenge(userId) {
  await connectDB();

  const challengeId = uuidv4();
  const steps = generateLivenessSteps();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await LivenessChallenge.create({
    challenge_id: challengeId,
    user_id: toObjectId(userId),
    steps,
    expires_at: expiresAt
  });

  return {
    challengeId,
    steps,
    expiresAt: expiresAt.toISOString()
  };
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

  // Simple validation
  if (!Array.isArray(proof) || proof.length !== 1) {
    return { error: "Invalid liveness proof" };
  }

  if (proof[0].step !== "blink") {
    return { error: "Please blink your eyes once" };
  }

  if (typeof proof[0].completed_at !== "number") {
    return { error: "Invalid blink timestamp" };
  }

  await LivenessChallenge.updateOne(
    { challenge_id: challengeId },
    {
      used_at: new Date()
    }
  );

  const livenessToken = signLivenessToken({
    userId,
    challengeId
  });

  return {
    success: true,
    livenessToken
  };
}

export { CHALLENGE_TTL_MS };