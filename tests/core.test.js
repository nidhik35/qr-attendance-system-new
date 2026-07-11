import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateQrTimestamp,
  verifyQrSignature,
  signQrPayload,
  isQRExpired,
  QR_EXPIRY_MS,
  CLOCK_SKEW_TOLERANCE_MS
} from "../lib/qr.js";
import { isInsideClassroom, getDistanceMeters } from "../lib/geofence.js";
import { isFaceMatch, euclideanDistance } from "../lib/faceMatch.js";
import { validateLivenessProof } from "../lib/livenessValidate.js";
import { loginSchema, verifyQRSchema } from "../lib/schemas/index.js";

describe("QR expiry and clock skew", () => {
  it("accepts QR within expiry window", () => {
    const now = Date.now();
    const result = validateQrTimestamp(now - 10_000, now);
    assert.equal(result.valid, true);
  });

  it("rejects expired QR beyond tolerance", () => {
    const now = Date.now();
    const result = validateQrTimestamp(now - QR_EXPIRY_MS - CLOCK_SKEW_TOLERANCE_MS - 1, now);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "expired");
  });

  it("rejects future timestamp beyond skew tolerance", () => {
    const now = Date.now();
    const result = validateQrTimestamp(now + CLOCK_SKEW_TOLERANCE_MS + 1000, now);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "future_timestamp");
  });

  it("isQRExpired mirrors validateQrTimestamp", () => {
    const fresh = Date.now();
    assert.equal(isQRExpired(fresh), false);
    assert.equal(isQRExpired(fresh - QR_EXPIRY_MS - 10_000), true);
  });
});

describe("QR HMAC signatures", () => {
  it("verifies valid signature", () => {
    const sessionId = "550e8400-e29b-41d4-a716-446655440000";
    const ts = Date.now();
    const nonce = "abc123";
    const sig = signQrPayload(sessionId, ts, nonce);
    assert.equal(verifyQrSignature(sessionId, ts, nonce, sig), true);
  });

  it("rejects tampered signature", () => {
    const sessionId = "550e8400-e29b-41d4-a716-446655440000";
    const ts = Date.now();
    const nonce = "abc123";
    assert.equal(verifyQrSignature(sessionId, ts, nonce, "deadbeef".repeat(8)), false);
  });
});

describe("Geofence boundary", () => {
  const classroom = { classroom_lat: 12.9141, classroom_lng: 74.856, radius_meters: 50 };

  it("allows student at classroom center", () => {
    const result = isInsideClassroom(12.9141, 74.856, classroom);
    assert.equal(result.allowed, true);
    assert.equal(result.distance, 0);
  });

  it("rejects student far from classroom", () => {
    const result = isInsideClassroom(13.0, 75.0, classroom);
    assert.equal(result.allowed, false);
    assert.ok(result.distance > 50);
  });

  it("handles boundary distance calculation", () => {
    const d = getDistanceMeters(12.9141, 74.856, 12.9141, 74.856);
    assert.equal(d, 0);
  });
});

describe("Face match", () => {
  it("matches identical descriptors", () => {
    const vec = Array.from({ length: 128 }, (_, i) => i * 0.001);
    const result = isFaceMatch(vec, [...vec]);
    assert.equal(result.matched, true);
  });

  it("rejects very different descriptors", () => {
    const a = Array.from({ length: 128 }, () => 0);
    const b = Array.from({ length: 128 }, () => 1);
    assert.ok(euclideanDistance(a, b) > 1);
    assert.equal(isFaceMatch(a, b).matched, false);
  });
});

describe("Liveness proof validation", () => {
  it("accepts valid ordered proof with timing", () => {
    const steps = ["blink", "turn_left"];
    const t = Date.now();
    const proof = [
      { step: "blink", completed_at: t },
      { step: "turn_left", completed_at: t + 800 }
    ];
    assert.equal(validateLivenessProof(steps, proof).valid, true);
  });

  it("rejects out-of-order steps", () => {
    const steps = ["blink", "turn_left"];
    const t = Date.now();
    const proof = [
      { step: "turn_left", completed_at: t + 800 },
      { step: "blink", completed_at: t }
    ];
    assert.equal(validateLivenessProof(steps, proof).valid, false);
  });

  it("rejects steps completed too fast", () => {
    const steps = ["blink", "turn_left"];
    const t = Date.now();
    const proof = [
      { step: "blink", completed_at: t },
      { step: "turn_left", completed_at: t + 50 }
    ];
    assert.equal(validateLivenessProof(steps, proof).reason, "steps_too_fast");
  });
});

describe("Zod schemas", () => {
  it("validates login payload", () => {
    const result = loginSchema.safeParse({
      email: "a@b.com",
      password: "secret",
      role: "student"
    });
    assert.equal(result.success, true);
  });

  it("rejects invalid verifyQR payload", () => {
    const result = verifyQRSchema.safeParse({
      attendance_challenge_token: "x",
      liveness_token: "y"
    });
    assert.equal(result.success, false);
  });
});
