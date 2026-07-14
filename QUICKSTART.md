# QR Attendance System - Quick Start Guide

## Prerequisites

- Node.js v18+ 
- npm or yarn
- MongoDB Atlas account
- git

## Installation Steps

### 1. Clone Repository
```bash
cd ~/Desktop/cns/qr-attendance-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File

Create `.env.local` in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qr-attendance

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# QR Code Configuration
QR_HMAC_SECRET=your_super_secret_qr_hmac_key_change_this_in_production

# Classroom Location (Default)
CLASSROOM_LAT=12.9141
CLASSROOM_LNG=74.856
CLASSROOM_RADIUS_METERS=50

# Environment
NODE_ENV=development
```

### 4. Run Database Setup (Optional)
```bash
npm run setup-db
```

### 5. Create Admin Account
```bash
npm run setup-accounts
```

This will create:
- **Admin Account**: Use `/api/login` with `loginType: "admin"`
- **Default Instructor**: Use `/api/login` with `loginType: "instructor"`

### 6. Start Development Server
```bash
npm run dev
```

Server runs at: `http://localhost:3000`

---

## First-Time Setup Workflow

### Step 1: Login as Admin
1. Go to `http://localhost:3000/admin/login`
2. Use admin credentials from setup

### Step 2: Create Instructors
1. Go to Admin Dashboard
2. Create instructor accounts with:
   - Name: "Dr. Smith"
   - Email: "smith@college.com"
   - Department: "Computer Science"
   - Subjects: ["Data Structures", "Algorithms"]

### Step 3: Instructor Creates Courses
1. Instructor logs in
2. Goes to Dashboard
3. Creates course "Data Structures"
4. Sets location (defaults work fine for testing)

### Step 4: Create Students
1. Student goes to `/student/register`
2. Creates account
3. Logs in
4. Sets up face
5. Ready for attendance

### Step 5: Generate QR and Mark Attendance
1. Instructor generates QR (valid for 30 seconds)
2. Student scans QR
3. Passes liveness check
4. System verifies location (if enabled)
5. Attendance marked

---

## Project Structure

```
qr-attendance-system/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin pages
│   ├── instructor/               # Instructor pages
│   ├── student/                  # Student pages
│   ├── layout.js
│   └── page.js
├── pages/                        # API routes
│   └── api/
│       ├── admin/                # Admin endpoints
│       ├── instructor/           # Instructor endpoints
│       ├── student/              # Student endpoints
│       ├── face/                 # Face verification
│       ├── qr/                   # QR validation
│       ├── auth/                 # Authentication
│       ├── login.js
│       ├── register.js
│       └── ...
├── lib/                          # Utilities & Models
│   ├── models/                   # Mongoose schemas
│   ├── auth.js                   # Password utilities
│   ├── jwt.js                    # JWT tokens
│   ├── db.js                     # MongoDB connection
│   ├── qr.js                     # QR signing/verification
│   ├── geofence.js               # Location verification
│   ├── faceMatch.js              # Face verification
│   ├── liveness.js               # Liveness checks
│   └── ...
├── components/                   # React components
│   ├── QRDisplay.js
│   ├── Scanner.js
│   ├── FaceCapture.js
│   └── PageShell.js
├── scripts/                      # Setup & utility scripts
│   ├── setup-db.js
│   ├── fix-admin.js
│   └── fix-instructor.js
├── package.json
├── .env.local                    # Environment variables (create this)
└── FIXES_APPLIED.md             # Detailed changelog
```

---

## Key Features Implemented

### ✅ Multi-Instructor Support
- Multiple instructors can register
- Each instructor has separate courses
- Instructors can only access their own courses

### ✅ Course Management
- Instructors create/edit courses
- Course codes unique per instructor
- Geofence settings per course
- Students can browse all courses

### ✅ QR-Based Attendance
- 30-second expiring QR codes
- Cryptographically signed
- Device binding to prevent forwarding
- Session-based tracking

### ✅ Multi-Factor Verification
- Face recognition
- Liveness detection (blink/pose)
- Geofence validation (classroom location)
- Device matching

### ✅ Complete Attendance Tracking
- Student + Course + Instructor attribution
- Timestamp and location recording
- Verification status tracking
- Attendance history per course

### ✅ Admin Dashboard
- Instructor management
- Student analytics
- Attendance exports (CSV)
- Audit logs
- Low attendance alerts

---

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test

# Setup database
npm run setup-db

# Setup admin/instructor accounts
npm run setup-accounts
```

---

## Common Issues & Fixes

### Issue: MongoDB Connection Error
**Solution**: 
- Check `MONGODB_URI` in `.env.local`
- Ensure MongoDB Atlas cluster is running
- Verify IP whitelist in MongoDB (allow 0.0.0.0/0 for development)

### Issue: "Method Not Allowed" Error
**Solution**: 
- Verify you're using correct HTTP method (GET, POST, etc.)
- Check endpoint path spelling
- Ensure Bearer token is included for protected routes

### Issue: QR Code Not Scanning
**Solution**:
- Ensure QR is less than 30 seconds old
- Check if session is still active
- Verify student has logged in and selected course

### Issue: Face Verification Fails
**Solution**:
- Ensure good lighting
- Keep face in center of frame
- Try registering face again
- Check face_descriptor has 128 elements

### Issue: Geofence Rejection
**Solution**:
- Check location settings in course
- Enable location services on device
- Increase radius_meters if too restrictive
- Verify GPS accuracy

---

## Testing Accounts

After running `npm run setup-accounts`:

**Admin Account**:
- Email: `admin@college.local`
- Password: `admin123456`

**Default Instructor**:
- Email: `instructor@college.local`
- Password: `instructor123456`

---

## Important Security Notes

⚠️ **Production Checklist**:
1. ✅ Change JWT_SECRET to a strong random string
2. ✅ Change QR_HMAC_SECRET to a strong random string
3. ✅ Set NODE_ENV=production
4. ✅ Use HTTPS only
5. ✅ Enable CORS properly
6. ✅ Restrict MongoDB IP whitelist
7. ✅ Enable audit logging
8. ✅ Regular database backups
9. ✅ Monitor error logs
10. ✅ Implement WAF rules

---

## Database Backup

```bash
# Backup from MongoDB Atlas
# Use MongoDB Compass or MongoDB CLI

# Via MongoDB CLI:
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/qr-attendance" --out ./backup

# Restore:
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/qr-attendance" ./backup
```

---

## Troubleshooting

### Enable Debug Logs
Add to `.env.local`:
```
DEBUG=*
```

### Check MongoDB Indexes
```bash
# In MongoDB Atlas / Compass
db.courses.getIndexes()
db.attendance.getIndexes()
db.sessions.getIndexes()
```

### Clear Rate Limiting
```bash
# In MongoDB (if rate limiting is stuck)
db.rate_limits.deleteMany({})
```

### Reset Database
```bash
# ⚠️ WARNING: This deletes all data!
db.dropDatabase()
npm run setup-db
```

---

## Performance Optimization

### Database Query Optimization
- All critical queries have indexes
- Pagination implemented where needed
- Lean queries used for read-only operations

### Caching Strategy
- MongoDB connection cached
- JWT tokens cached in memory
- Session data cached on client

### Rate Limiting
- Prevents abuse of key endpoints
- Configurable per endpoint
- IP-based and user-based limits

---

## Monitoring & Logs

### Audit Trail
- Every action logged to `audit_logs` collection
- Includes: user_id, action, status, ip_address, timestamp
- Query: `db.audit_logs.find({ status: "failed" })`

### Error Monitoring
- Check server console for errors
- Monitor MongoDB error logs
- Review network requests in browser DevTools

### Performance Monitoring
- Monitor response times
- Check database query performance
- Monitor memory usage

---

## Next Steps After Setup

1. **Customize Classroom Location**
   - Update CLASSROOM_LAT/CLASSROOM_LNG in .env.local
   - Or set per-course via API

2. **Set Up Email Notifications** (optional)
   - Configure SMTP settings
   - Test attendance confirmation emails
   - Configure low attendance warnings

3. **Configure Face Recognition**
   - Integrate with face-api.js library
   - Adjust face matching threshold if needed

4. **Set Up Analytics Dashboard**
   - Configure attendance reports
   - Set up metrics tracking
   - Create automated exports

5. **Enable 2FA for Admins** (optional)
   - Implement TOTP authentication
   - Add backup codes

---

## Support & Documentation

- **API Reference**: See `API_REFERENCE.md`
- **Detailed Fixes**: See `FIXES_APPLIED.md`
- **Original Docs**: See `README.md`, `FEATURES.md`, `DEPLOYMENT.md`

---

## Support Contact

For issues or questions:
1. Check documentation files
2. Review error messages carefully
3. Check MongoDB logs
4. Review audit logs
5. Enable debug mode

Good luck with your QR Attendance System! 🎓
