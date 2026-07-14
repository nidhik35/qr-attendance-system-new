// Refresh token persistence and revocation.
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "./db";
import RefreshToken from "./models/RefreshToken.js";
import User from "./models/User.js";
import { hashToken, signAccessToken, signRefreshToken } from "./jwt";
import { toObjectId, docId } from "./mongo";

const REFRESH_DAYS = 7;

export async function issueTokenPair(user, deviceId = null) {
  await connectDB();
  const jti = uuidv4();
  const refreshToken = signRefreshToken(user, jti);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user_id: toObjectId(user.id),
    token_hash: tokenHash,
    jti,
    device_id: deviceId,
    expires_at: expiresAt
  });

  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken, decoded) {
  await connectDB();
  const tokenHash = hashToken(refreshToken);

  const tokenDoc = await RefreshToken.findOne({ token_hash: tokenHash, jti: decoded.jti }).lean();
  if (!tokenDoc) {
    return { error: "Refresh token not found" };
  }

  if (tokenDoc.revoked_at) {
    return { error: "Refresh token revoked" };
  }

  const userDoc = await User.findById(tokenDoc.user_id).lean();
  if (!userDoc) {
    return { error: "User not found" };
  }

  if ((userDoc.token_version ?? 0) !== (decoded.token_version ?? 0)) {
    return { error: "Token version mismatch" };
  }

  await RefreshToken.updateOne({ _id: tokenDoc._id }, { revoked_at: new Date() });

  const user = {
    id: docId(userDoc),
    email: userDoc.email,
    name: userDoc.name,
    role: userDoc.role,
    token_version: userDoc.token_version ?? 0
  };

  return issueTokenPair(user);
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  await connectDB();
  const tokenHash = hashToken(refreshToken);
  await RefreshToken.updateMany(
    { token_hash: tokenHash, revoked_at: null },
    { revoked_at: new Date() }
  );
}

export async function revokeAllUserTokens(userId) {
  await connectDB();
  await RefreshToken.updateMany(
    { user_id: toObjectId(userId), revoked_at: null },
    { revoked_at: new Date() }
  );
}

export async function invalidateUserSessions(userId) {
  await connectDB();
  await User.updateOne({ _id: toObjectId(userId) }, { $inc: { token_version: 1 } });
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
