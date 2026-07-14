// Signed QR payloads, expiry validation with clock-skew tolerance.
import crypto from "crypto";

const QR_EXPIRY_MS = 30 * 1000;
const CLOCK_SKEW_TOLERANCE_MS = 5 * 1000;

function getQrSecret() {
  return process.env.QR_HMAC_SECRET || process.env.JWT_SECRET || "qr-hmac-dev-secret";
}

function buildSignString(fields) {
  return [
    fields.sessionId,
    fields.instructorId,
    fields.instructorName,
    fields.subject,
    fields.timestamp,
    fields.expiresAt,
    fields.nonce
  ].join(":");
}

export function signQrPayload(fields) {
  return crypto.createHmac("sha256", getQrSecret()).update(buildSignString(fields)).digest("hex");
}

export function createQRPayload({ sessionId, instructorId, instructorName, subject }) {
  const timestamp = Date.now();
  const expiresAt = timestamp + QR_EXPIRY_MS;
  const nonce = crypto.randomBytes(8).toString("hex");
  const signature = signQrPayload({
    sessionId,
    instructorId,
    instructorName,
    subject,
    timestamp,
    expiresAt,
    nonce
  });

  return {
    session_id: sessionId,
    instructor_id: instructorId,
    instructor_name: instructorName,
    subject,
    timestamp,
    expires_at: expiresAt,
    nonce,
    signature
  };
}

export function verifyQrSignature(payload) {
  const {
    session_id: sessionId,
    instructor_id: instructorId,
    instructor_name: instructorName,
    subject,
    timestamp,
    expires_at: expiresAt,
    nonce,
    signature
  } = payload;

  if (!sessionId || !timestamp || !nonce || !signature) {
    return false;
  }

  const expected = signQrPayload({
    sessionId,
    instructorId: instructorId || "",
    instructorName: instructorName || "",
    subject: subject || "",
    timestamp: Number(timestamp),
    expiresAt: Number(expiresAt || timestamp),
    nonce
  });

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
