// Refresh token persistence and revocation.
import { v4 as uuidv4 } from "uuid";
import db from "./db";
import { hashToken, signAccessToken, signRefreshToken } from "./jwt";

const REFRESH_DAYS = 7;

export async function issueTokenPair(user, deviceId = null) {
  const jti = uuidv4();
  const refreshToken = signRefreshToken(user, jti);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await db.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, jti, device_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, tokenHash, jti, deviceId, expiresAt]
  );

  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken, decoded) {
  const tokenHash = hashToken(refreshToken);
  const [rows] = await db.execute(
    `SELECT rt.id AS token_id, rt.user_id, rt.revoked_at,
            s.id, s.email, s.name, s.role, s.token_version
     FROM refresh_tokens rt
     JOIN students s ON s.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.jti = ?`,
    [tokenHash, decoded.jti]
  );

  if (rows.length === 0) {
    return { error: "Refresh token not found" };
  }

  const row = rows[0];
  if (row.revoked_at) {
    return { error: "Refresh token revoked" };
  }
  if (row.token_version !== decoded.token_version) {
    return { error: "Token version mismatch" };
  }

  await db.execute("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?", [row.token_id]);

  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    token_version: row.token_version
  };

  return issueTokenPair(user);
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await db.execute(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL",
    [tokenHash]
  );
}

export async function revokeAllUserTokens(userId) {
  await db.execute(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL",
    [userId]
  );
}

export async function invalidateUserSessions(userId) {
  await db.execute(
    "UPDATE students SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?",
    [userId]
  );
  await revokeAllUserTokens(userId);
}

export function setRefreshCookie(res, token) {
  const maxAge = REFRESH_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `refreshToken=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`
  );
}

export function clearRefreshCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure}`
  );
}

export function getRefreshTokenFromRequest(req) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/(?:^|;\s*)refreshToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
