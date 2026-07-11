# Feature Status (Complete)

## Implemented

- JWT authentication with **15-min access tokens** + **7-day refresh tokens** (httpOnly cookie)
- Token invalidation on **logout** and **role change** (`token_version`)
- Role-based access (`student`, `instructor`, `admin`)
- **HMAC-signed QR codes** + device-bound attendance challenge tokens (anti-screenshot forwarding)
- QR generation + 30s expiry with **±5s clock-skew tolerance**
- Live camera QR scan (no upload)
- **Liveness detection** (blink + head-turn prompts) before face match
- Device binding
- Geofencing (50m, per-course coordinates)
- Anti-proxy checks (IP + device)
- Multi-course sessions
- Face verification (`@vladmandic/face-api`)
- **Audit logging** (all scan/login attempts — success/fail/flagged)
- Admin analytics dashboard with audit feed
- **Zod validation** on all API routes
- **MySQL-backed rate limiting** on login, register, QR, face, attendance
- CSV export
- PDF export
- Email notifications (optional SMTP)
- OpenAPI JSON + Swagger UI (`/docs`)
- Deployment guide (`DEPLOYMENT.md`)
- **Known limitations documented** (`LIMITATIONS.md`)
- **Unit tests** for QR expiry, geofence, liveness, schemas (`npm test`)

## Default Accounts

- Instructor: `instructor@gmail.com` / `Instructor@123`
- Admin: `admin@college.com` / `Admin@123`
- Student: register at `/student/register`, then complete `/student/face-setup`

## Student Attendance Steps

1. Login
2. Register face (first time)
3. Scan signed QR → server validates + issues challenge token
4. Complete liveness prompts (blink / head turn) + face verify
5. Attendance marked (geofence + device + anti-proxy checks)
