# Deployment Guide

## 1) Deploy Frontend/Backend (Vercel)

1. Push project to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Framework preset: **Next.js**.
4. Add Environment Variables:

```env
MONGODB_URI=mongodb://localhost:27017/qr_attendance
JWT_SECRET=your-long-random-secret
QR_HMAC_SECRET=your-qr-hmac-secret
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

Use any managed MongoDB:

- MongoDB Atlas
- Railway MongoDB
- AWS DocumentDB
- Render MongoDB

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
