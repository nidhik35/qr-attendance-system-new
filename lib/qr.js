// Signed QR payloads, expiry validation with clock-skew tolerance.
import crypto from "crypto";

const QR_EXPIRY_MS = 30 * 1000;
const CLOCK_SKEW_TOLERANCE_MS = 5 * 1000;

function getQrSecret() {
  return process.env.QR_HMAC_SECRET || process.env.JWT_SECRET || "qr-hmac-dev-secret";
}

export function createQRPayload(sessionId, nonce = null) {
  const timestamp = Date.now();
  const safeNonce = nonce || crypto.randomBytes(8).toString("hex");
  const signature = signQrPayload(sessionId, timestamp, safeNonce);
  return {
    session_id: sessionId,
    timestamp,
    nonce: safeNonce,
    signature
  };
}

export function signQrPayload(sessionId, timestamp, nonce) {
  const payload = `${sessionId}:${timestamp}:${nonce}`;
  return crypto.createHmac("sha256", getQrSecret()).update(payload).digest("hex");
}

export function verifyQrSignature(sessionId, timestamp, nonce, signature) {
  if (!sessionId || !timestamp || !nonce || !signature) {
    return false;
  }
  const expected = signQrPayload(sessionId, Number(timestamp), nonce);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(String(signature), "hex")
    );
  } catch {
    return false;
  }
}

export function validateQrTimestamp(timestamp, serverNow = Date.now()) {
  const parsedTime = Number(timestamp);
  if (!parsedTime || Number.isNaN(parsedTime)) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const age = serverNow - parsedTime;
  if (age > QR_EXPIRY_MS + CLOCK_SKEW_TOLERANCE_MS) {
    return { valid: false, reason: "expired", age, maxAge: QR_EXPIRY_MS };
  }
  if (age < -CLOCK_SKEW_TOLERANCE_MS) {
    return { valid: false, reason: "future_timestamp", skew: -age };
  }
  return { valid: true, age };
}

export function isQRExpired(timestamp, serverNow = Date.now()) {
  return !validateQrTimestamp(timestamp, serverNow).valid;
}

export { QR_EXPIRY_MS, CLOCK_SKEW_TOLERANCE_MS };
