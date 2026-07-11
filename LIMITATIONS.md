# Known Security Limitations

This document describes known gaps and threat-model boundaries for the QR Attendance System. Documenting these explicitly is part of operating the system responsibly in production.

## GPS / Geolocation

- Browser geolocation can be **spoofed** on rooted/jailbroken devices or via developer tools.
- Indoor GPS accuracy is often **±20–100m**, which may false-negative legitimate students or false-positive near-boundary cases.
- The geofence is a **deterrent**, not cryptographic proof of physical presence.

## IP Address & VPN

- Shared campus Wi-Fi causes **legitimate IP collisions**; our anti-proxy rule may block valid students on the same network.
- VPNs and proxies can **mask or relocate** IP addresses, weakening IP-based anti-proxy checks.
- IP binding is best-effort and should not be the sole trust signal.

## Face Verification & Liveness

- Face descriptors are computed **client-side**; a modified client could submit crafted vectors (mitigated partially by liveness timing checks).
- Liveness (blink / head-turn) reduces **photo spoofing** but does **not** stop sophisticated video replay or deepfake attacks.
- `@vladmandic/face-api` is suitable for demos; production deployments should consider vendor liveness SDKs with server-side verification.

## QR Codes

- Signed QR payloads prevent trivial screenshot forwarding to another device when combined with **device-bound challenge tokens**.
- A student could still photograph the QR **on the same registered device** within the 30-second window — mitigated by liveness + geofence + face match.
- Clock skew beyond **±5 seconds** will reject valid scans; NTP-synced devices are recommended.

## Authentication & Tokens

- Access tokens (15 min) in **localStorage** are vulnerable to XSS; refresh tokens are in **httpOnly cookies** (better).
- Token invalidation on logout/role change uses `token_version` + refresh token revocation; stolen access tokens remain valid until expiry (~15 min).
- Rate limiting uses MySQL and is suitable for small deployments; high-traffic production should use Redis.

## Device Binding

- Device ID is derived from `navigator.userAgent`, which can be **spoofed** and changes with browser updates.
- Device binding reduces casual proxy attendance but is not tamper-proof.

## Audit & Compliance

- Audit logs capture scan attempts with IP and metadata but **not** raw geolocation coordinates in all failure paths.
- Logs should be retained and protected according to your institution's data policy (GDPR, FERPA, etc.).

## Recommendations for Production Hardening

1. Set strong secrets: `JWT_SECRET`, `QR_HMAC_SECRET` in environment (never defaults).
2. Enforce HTTPS everywhere.
3. Use a dedicated liveness provider for high-stakes deployments.
4. Add Redis-backed rate limiting and session store for multi-instance deployments.
5. Periodically review audit logs for flagged events.
