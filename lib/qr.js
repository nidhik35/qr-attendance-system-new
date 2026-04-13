// QR payload helpers for generation and expiry validation.
const QR_EXPIRY_MS = 30 * 1000;

export function createQRPayload(sessionId) {
  return {
    session_id: sessionId,
    timestamp: Date.now()
  };
}

export function isQRExpired(timestamp) {
  const parsedTime = Number(timestamp);
  if (!parsedTime) {
    return true;
  }
  return Date.now() - parsedTime > QR_EXPIRY_MS;
}

export { QR_EXPIRY_MS };
