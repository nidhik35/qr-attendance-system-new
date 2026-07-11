// JWT access + refresh token helpers with short-lived access tokens.
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "qr-attendance-dev-secret-change-in-production";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES || "7d";
const LIVENESS_EXPIRES_IN = "2m";
const CHALLENGE_EXPIRES_IN = "60s";

export function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token_version: user.token_version ?? 0
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

export function signRefreshToken(user, jti) {
  return jwt.sign(
    {
      id: user.id,
      jti,
      type: "refresh",
      token_version: user.token_version ?? 0
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

export function signLivenessToken(payload) {
  return jwt.sign({ ...payload, type: "liveness" }, JWT_SECRET, {
    expiresIn: LIVENESS_EXPIRES_IN
  });
}

export function signAttendanceChallengeToken(payload) {
  return jwt.sign({ ...payload, type: "attendance_challenge" }, JWT_SECRET, {
    expiresIn: CHALLENGE_EXPIRES_IN
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }
  return decoded;
}

export function verifyTypedToken(token, expectedType) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== expectedType) {
    throw new Error(`Invalid token type: expected ${expectedType}`);
  }
  return decoded;
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export { JWT_SECRET, ACCESS_EXPIRES_IN, REFRESH_EXPIRES_IN };
