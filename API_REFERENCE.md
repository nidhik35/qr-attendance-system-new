# QR Attendance System - API Reference

## Authentication

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Access tokens expire in 15 minutes. Use the refresh token endpoint to get new tokens.

---

## Endpoints by Role

### STUDENT ENDPOINTS

#### 1. Register Account
```
POST /api/register
Body: {
  "name": "John Student",
  "email": "student@college.com",
  "password": "securepass123",
  "role": "student"
}
Response: { "message": "Registration successful" }
```

#### 2. Login
```
POST /api/login
Body: {
  "email": "student@college.com",
  "password": "securepass123",
  "role": "student",
  "device_id": "device_identifier"
}
Response: {
  "success": true,
  "accessToken": "token",
  "userId": "user_id",
  "role": "student",
  "user": { "id", "name", "email", "role" }
}
```

#### 3. Register Face
```
POST /api/face/register
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "face_descriptor": [number, number, ...] // 128-d array from face-api
}
Response: { "success": true, "message": "Face registered successfully" }
```

#### 4. Check Face Status
```
GET /api/face/status
Headers: { "Authorization": "Bearer <token>" }
Response: { "hasFace": true/false }
```

#### 5. Get Liveness Challenge
```
GET /api/face/challenge
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "challenge_id": "uuid",
  "steps": [
    { "step": "blink", "timeout_ms": 5000 },
    { "step": "turn_left", "timeout_ms": 5000 },
    { "step": "turn_right", "timeout_ms": 5000 }
  ],
  "liveness_token": "token"
}
```

#### 6. Complete Liveness Challenge
```
POST /api/face/challenge
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "challenge_id": "uuid",
  "proof": [
    {
      "step": "blink",
      "completed_at": 1234567890,
      "metrics": { "confidence": 0.95 }
    },
    // ... other steps
  ]
}
Response: { "liveness_token": "token", "valid": true }
```

#### 7. Browse Available Courses
```
GET /api/student/courses
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "courses": [
    {
      "id": "course_id",
      "course_code": "CSE101",
      "course_name": "Data Structures",
      "instructor": {
        "id": "instructor_id",
        "name": "Dr. Smith"
      }
    }
  ],
  "total": 5
}
```

#### 8. Scan QR Code - Get Challenge Token
```
POST /api/qr/challenge
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "session_id": "uuid",
  "instructor_id": "instructor_id",
  "instructor_name": "Dr. Smith",
  "subject": "Data Structures",
  "timestamp": 1234567890000,
  "expires_at": 1234567920000,
  "nonce": "random_nonce",
  "signature": "hmac_signature",
  "device_id": "device_identifier"
}
Response: {
  "success": true,
  "attendance_challenge_token": "token",
  "session_id": "uuid",
  "course_id": "course_id",
  "course_code": "CSE101"
}
```

#### 9. Verify Attendance with Face + Liveness + Location
```
POST /api/verifyQR
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "attendance_challenge_token": "token",
  "liveness_token": "token",
  "device_id": "device_identifier",
  "latitude": 12.9141,
  "longitude": 74.856,
  "face_descriptor": [number, number, ...] // 128-d array
}
Response: {
  "success": true,
  "message": "Attendance marked successfully",
  "attendancePercentage": 85
}
```

#### 10. Get Attendance History
```
GET /api/attendanceHistory?course_id=course_id (optional)
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "attendance": [
    {
      "id": "attendance_id",
      "session_id": "session_id",
      "course_id": "course_id",
      "course_code": "CSE101",
      "course_name": "Data Structures",
      "instructor_name": "Dr. Smith",
      "status": "present",
      "face_verified": true,
      "liveness_verified": true,
      "latitude": 12.9141,
      "longitude": 74.856,
      "date": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 15
}
```

#### 11. Logout
```
POST /api/auth/logout
Headers: { "Authorization": "Bearer <token>" }
Response: { "success": true, "message": "Logged out" }
```

#### 12. Refresh Token
```
POST /api/auth/refresh
Cookies: { "refreshToken": "token" }
Response: {
  "success": true,
  "accessToken": "new_token",
  "user": { "id", "name", "email", "role" }
}
```

---

### INSTRUCTOR ENDPOINTS

#### 1. Create Account
```
POST /api/admin/instructors/
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "name": "Dr. Smith",
  "email": "instructor@college.com",
  "password": "securepass123",
  "department": "Computer Science",
  "subjects": ["Data Structures", "Algorithms"]
}
Response: {
  "message": "Instructor created successfully",
  "instructor": { "id", "name", "email", "department", "subjects" }
}
```

#### 2. Login (Same as student - use loginType: "instructor")
```
POST /api/login
Body: {
  "email": "instructor@college.com",
  "password": "securepass123",
  "loginType": "instructor",
  "device_id": "device_identifier"
}
```

#### 3. List My Courses
```
GET /api/courses
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "courses": [
    {
      "id": "course_id",
      "course_code": "CSE101",
      "course_name": "Data Structures",
      "classroom_lat": 12.9141,
      "classroom_lng": 74.856,
      "radius_meters": 50
    }
  ]
}
```

#### 4. Create Course
```
POST /api/instructor/courses
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "course_code": "CSE101",
  "course_name": "Data Structures",
  "classroom_lat": 12.9141,
  "classroom_lng": 74.856,
  "radius_meters": 50
}
Response: {
  "message": "Course created successfully",
  "course": { "id", "course_code", "course_name", "classroom_lat", ... }
}
```

#### 5. Update Course
```
PUT /api/instructor/courses?id=course_id
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "course_name": "Updated Name",
  "classroom_lat": 12.92,
  "classroom_lng": 74.87,
  "radius_meters": 60,
  "is_active": true
}
```

#### 6. Get My Courses (CRUD)
```
GET /api/instructor/courses
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "courses": [
    { "id", "course_code", "course_name", "classroom_lat", ... }
  ]
}
```

#### 7. Generate QR Code
```
POST /api/generateQR
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "course_id": "course_id"
}
Response: {
  "message": "QR generated successfully",
  "qrImage": "data:image/png;base64,...",
  "session": {
    "session_id": "uuid",
    "instructor_id": "instructor_id",
    "instructor_name": "Dr. Smith",
    "subject": "Data Structures",
    "timestamp": 1234567890000,
    "expires_at": 1234567920000,
    "nonce": "nonce",
    "signature": "signature"
  },
  "course_id": "course_id",
  "course_code": "CSE101",
  "expires_in_seconds": 30
}
```

#### 8. View Session Attendance
```
GET /api/instructor/attendance?session_id=session_id
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "session": {
    "session_id": "uuid",
    "course_id": "course_id",
    "course_code": "CSE101",
    "course_name": "Data Structures",
    "is_active": false,
    "created_at": "2024-01-15T10:00:00Z"
  },
  "attendance": [
    {
      "id": "attendance_id",
      "student_id": "student_id",
      "student_name": "John Student",
      "course_code": "CSE101",
      "status": "present",
      "face_verified": true,
      "liveness_verified": true,
      "latitude": 12.9141,
      "longitude": 74.856,
      "date": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 45
}
```

#### 9. View Course Attendance
```
GET /api/instructor/attendance?course_id=course_id
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "course": {
    "id": "course_id",
    "course_code": "CSE101",
    "course_name": "Data Structures"
  },
  "attendance": [
    { "id", "session_id", "student_id", "student_name", "status", "date", ... }
  ],
  "total": 450
}
```

#### 10. View Session History
```
GET /api/instructor/sessions
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "sessions": [
    {
      "session_id": "uuid",
      "course_id": "course_id",
      "course_code": "CSE101",
      "course_name": "Data Structures",
      "is_active": false,
      "created_at": "2024-01-15T10:00:00Z",
      "qr_generated_at": "2024-01-15T10:00:00Z",
      "expires_at": "2024-01-15T10:00:30Z",
      "present_count": 45
    }
  ],
  "total": 156
}
```

---

### ADMIN ENDPOINTS

#### 1. Admin Login
```
POST /api/login
Body: {
  "email": "admin@college.com",
  "password": "securepass123",
  "loginType": "admin",
  "device_id": "device_identifier"
}
```

#### 2. List All Instructors
```
GET /api/admin/instructors/
Headers: { "Authorization": "Bearer <admin_token>" }
Response: {
  "instructors": [
    {
      "id": "instructor_id",
      "name": "Dr. Smith",
      "email": "instructor@college.com",
      "department": "Computer Science",
      "subjects": ["Data Structures", "Algorithms"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 12
}
```

#### 3. Create Instructor
```
POST /api/admin/instructors/
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "name": "Dr. New",
  "email": "new@college.com",
  "password": "securepass123",
  "department": "Computer Science",
  "subjects": ["Operating Systems"]
}
```

#### 4. Update Instructor
```
PUT /api/admin/instructors/?id=instructor_id
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "name": "Dr. Updated",
  "department": "IT",
  "subjects": ["Algorithms", "Databases"],
  "email": "updated@college.com"
}
```

#### 5. Delete Instructor
```
DELETE /api/admin/instructors/?id=instructor_id
Headers: { "Authorization": "Bearer <admin_token>" }
Response: { "message": "Instructor deleted successfully" }
```

#### 6. View Analytics
```
GET /api/admin/analytics
Headers: { "Authorization": "Bearer <admin_token>" }
Response: {
  "summary": {
    "total_students": 250,
    "total_instructors": 15,
    "total_courses": 45,
    "total_sessions": 1200,
    "total_attendance": 45000
  },
  "courseStats": [
    {
      "course_id": "course_id",
      "course_code": "CSE101",
      "course_name": "Data Structures",
      "sessions_count": 30,
      "present_count": 890
    }
  ],
  "monthlyStats": [
    { "month": "2024-01", "attendance_count": 5000 }
  ],
  "lowAttendance": [
    {
      "id": "student_id",
      "name": "Student Name",
      "email": "student@college.com",
      "total_sessions": 30,
      "attended_sessions": 12,
      "attendance_percentage": 40
    }
  ],
  "auditLogs": [
    {
      "id": "log_id",
      "user_id": "user_id",
      "user_name": "User Name",
      "action": "login",
      "resource": "session",
      "status": "success",
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-15T10:00:00Z",
      "metadata": {}
    }
  ],
  "auditSummary": [
    { "status": "success", "count": 450 },
    { "status": "failed", "count": 12 }
  ]
}
```

#### 7. Export Attendance as CSV
```
GET /api/admin/export
Headers: { "Authorization": "Bearer <admin_token>" }
Response: CSV file download with columns:
  student_name, student_email, course_code, course_name, instructor_name,
  session_id, status, face_verified, liveness_verified, date, latitude,
  longitude, ip_address
```

---

## Error Responses

### Standard Error Format
```
{
  "success": false,
  "message": "Error description",
  "details": ["field1: error message", "field2: error message"]
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Validation error
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions or authorization failed)
- `404`: Not found
- `405`: Method not allowed
- `409`: Conflict (duplicate record)
- `429`: Rate limited
- `500`: Server error

---

## Rate Limiting

- **Login**: 10 attempts per minute
- **Register**: 5 attempts per minute
- **QR Generation**: 30 attempts per minute per instructor
- **QR Challenge**: 20 attempts per minute per student
- **Attendance Verification**: 10 attempts per minute per student
- **Face Registration**: 5 attempts per minute per student
- **Token Refresh**: 30 attempts per minute

---

## Security Notes

1. **Always use HTTPS** in production
2. **Never expose JWT_SECRET** or QR_HMAC_SECRET
3. **Refresh tokens should be HttpOnly cookies**
4. **Device ID should be a stable identifier** (not just user agent)
5. **QR codes are only valid for 30 seconds**
6. **Attendance requires face verification and liveness check**
7. **Geofence verification is mandatory**
8. **IP conflicts detected within 10-minute window**
9. **Device conflicts detected within 10-minute window**
10. **All actions are audited with IP address and timestamp**

---

## Testing Workflow

### Student Flow
1. Register account
2. Login
3. Setup face
4. Browse courses
5. Scan QR code
6. Pass liveness challenge
7. Verify face
8. Confirm location
9. Mark attendance
10. Check attendance history

### Instructor Flow
1. Login with admin-created account
2. Create course
3. Login as instructor
4. Generate QR for course
5. Monitor attendance
6. View session statistics

### Admin Flow
1. Login with admin account
2. Create instructors
3. View analytics
4. Export attendance
5. Monitor audit logs

