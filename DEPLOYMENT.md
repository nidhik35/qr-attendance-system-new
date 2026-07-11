# Deployment Guide

## 1) Deploy Frontend/Backend (Vercel)

1. Push project to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Framework preset: **Next.js**.
4. Add Environment Variables:

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_PORT=3306
JWT_SECRET=your-long-random-secret
CLASSROOM_LAT=12.9141
CLASSROOM_LNG=74.8560
CLASSROOM_RADIUS_METERS=50
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

5. Deploy.

## 2) Database Hosting Options

Use any managed MySQL:

- PlanetScale
- Railway MySQL
- AWS RDS
- Render MySQL

Run:

```bash
npm run setup-db
npm run setup-accounts
```

## 3) Production Checklist

- Change `JWT_SECRET` to a strong random value
- Use HTTPS domain
- Restrict instructor/admin account creation
- Set classroom coordinates accurately
- Keep `CLASSROOM_RADIUS_METERS=50` for real geofence
- Configure SMTP for email notifications

## 4) Local Network Demo (Phone + Laptop)

```bash
npx next dev -H 0.0.0.0 -p 3002
```

Open on phone:

`http://<laptop-ip>:3002`

## 5) Postman / API Testing

1. `POST /api/login` → copy `accessToken`
2. Add header: `Authorization: Bearer <token>`
3. Call protected routes (`/api/generateQR`, `/api/verifyQR`, `/api/admin/analytics`)

Open Swagger UI:

`/docs`

## 6) Resume-Ready Feature Statement

Implemented JWT authentication, role-based authorization, QR session security, geofencing, face verification, anti-proxy checks, admin analytics, CSV/PDF export, and API documentation.
