import { authenticateRequest } from "../../../lib/apiAuth";
import {
  getRefreshTokenFromRequest,
  revokeRefreshToken,
  clearRefreshCookie
} from "../../../lib/refreshToken";
import { logAudit } from "../../../lib/audit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const refreshToken = getRefreshTokenFromRequest(req);
  const auth = await authenticateRequest(req);

  await revokeRefreshToken(refreshToken);
  clearRefreshCookie(res);

  await logAudit({
    req,
    userId: auth.user?.id ?? null,
    action: "logout",
    resource: "session",
    status: "success"
  });

  return res.status(200).json({ success: true, message: "Logged out" });
}
