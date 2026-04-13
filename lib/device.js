// Device helper that normalizes user agent strings from the frontend.
export function getDeviceId(userAgent) {
  if (!userAgent || typeof userAgent !== "string") {
    return "";
  }
  return userAgent.trim();
}
