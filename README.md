# Secure QR Code Based Attendance System

A complete full-stack attendance system built with Next.js (App Router), MySQL, bcrypt authentication, QR generation, and QR scanning with **role-based authentication** supporting separate workflows for students and instructors.

## 1. Role-Based Architecture

### User Roles
- **Student**: Can register, login, and scan QR codes for attendance
- **Instructor**: Can login, generate QR codes, and manage attendance sessions

### Separate Workflows
- **Student Flow**: `/student/register` → `/student/login` → `/student/scan`
- **Instructor Flow**: `/instructor/login` → `/instructor/dashboard`

## 2. Tech Stack

- **Frontend + Backend:** Next.js (App Router + API routes)
- **Database:** MySQL with role-based schema
- **Authentication:** `bcryptjs` with role validation
- **QR Generation:** `qrcode`
- **QR Scanning:** `html5-qrcode`

## 3. Database Schema (Updated)

### Students Table
```sql
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash TEXT,
  device_id TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'student' -- 'student' or 'instructor'
);
```

### Instructor Account Creation
```sql
INSERT INTO students (name, email, password_hash, role)
VALUES ('Nidhi', 'nidhi@gmail.com', '<hashed_password>', 'instructor');
```

## 4. Routing Structure (Next.js App Router)

### Instructor Routes
- `/instructor/login` - Instructor login form
- `/instructor/dashboard` - QR code generation (instructor only)

### Student Routes
- `/student/register` - Student registration (assigns 'student' role)
- `/student/login` - Student login form
- `/student/scan` - QR scanner (student only)

## 5. Authentication Flow

### Login API (`/api/login`)
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student", // or "instructor"
  "device_id": "userAgent"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 1,
  "role": "student",
  "user": { "id": 1, "name": "John", "email": "user@example.com", "role": "student" }
}
```

### Role Validation
- Email + password + role must match database record
- Device binding enforced on first login
- Role mismatch returns error

## 6. Access Control

### Route Protection
- `/instructor/dashboard` → Requires `role === 'instructor'`
- `/student/scan` → Requires `role === 'student'`
- Unauthorized access → Redirect to appropriate login page

### API Security
- `/api/generateQR` → Instructor only
- `/api/verifyQR` → Student only
- Role validation in all protected endpoints

## 7. Frontend Pages

### Home Page (`/`)
- **"Student Register"** → `/student/register`
- **"Student Login"** → `/student/login`
- **"Instructor Login"** → `/instructor/login`

### Student Pages
- **Registration**: Creates account with `role = 'student'`
- **Login**: Validates `role = 'student'`
- **Scan**: QR scanner for attendance marking

### Instructor Pages
- **Login**: Validates `role = 'instructor'`
- **Dashboard**: QR generation and session management

## 8. API Routes

- `/api/register` → Student registration (role = 'student')
- `/api/login` → Role-based login with validation
- `/api/generateQR` → Instructor only - Create session + QR
- `/api/verifyQR` → Student only - Validate QR + mark attendance

## 9. Security Features

- **Role-based authentication** with database validation
- bcrypt-based password hashing
- UUID session IDs
- QR expiry validation (30 seconds)
- strict device binding checks
- duplicate attendance prevention
- **API endpoint protection** by user role
- **Frontend route protection** with role verification

## 10. Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create/update `.env.local`:
```env
DB_HOST=localhost
DB_USER=attendance_user
DB_PASSWORD=StrongPass123!
DB_NAME=qr_attendance
DB_PORT=3306
```

### 3. Setup Database
```bash
npm run setup-db
```

### 4. Create Instructor Account
```bash
node scripts/fix-instructor.js
```
This creates: `instructor@gmail.com` / `Instructor@123`

### 5. Start Application
```bash
npm run dev
```
Open `http://localhost:3000`

## 11. Usage Guide

### For Students:
1. Visit home page → Click "Student Register"
2. Fill registration form → Account created with student role
3. Click "Student Login" → Login with credentials
4. Auto-redirected to `/student/scan`
5. Scan instructor's QR code to mark attendance

### For Instructors:
1. Visit home page → Click "Instructor Login"
2. Login with instructor credentials
3. Auto-redirected to `/instructor/dashboard`
4. Click "Generate QR" to create attendance session
5. Students can now scan the QR code

## 12. Error Handling

Clear error messages for:
- Invalid credentials
- Role mismatch (trying to login as wrong role)
- Unauthorized access attempts
- Device binding violations
- QR expiry/validation errors

## 13. Key Features

- ✅ **Multi-user support** with role separation
- ✅ **Clean routing** - no confusion between student/instructor flows
- ✅ **Industry-level security** with role-based access control
- ✅ **Device binding** for attendance integrity
- ✅ **QR expiry** (30 seconds) for security
- ✅ **Duplicate prevention** using database constraints
- ✅ **Auto-refresh** QR codes for instructors
- ✅ **Beginner-friendly** comments and error messages

## 2. Folder Structure

```text
qr-attendance-system/
├── app/
│   ├── register/page.js
│   ├── login/page.js
│   ├── dashboard/page.js
│   ├── scan/page.js
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── pages/api/
│   ├── register.js
│   ├── login.js
│   ├── generateQR.js
│   └── verifyQR.js
├── lib/
│   ├── db.js
│   ├── auth.js
│   ├── device.js
│   └── qr.js
├── components/
│   ├── QRDisplay.js
│   └── Scanner.js
├── scripts/
│   └── setup-db.js
├── .env.local
├── schema.sql
├── package.json
└── README.md
```

## 3. QR Code Functionality

- QR contains:
  - `session_id` (UUID random session id)
  - `timestamp` (current time in milliseconds)
- QR expiry is **30 seconds** (checked in backend).
- QR is displayed on instructor dashboard.
- QR auto-refreshes every 30 seconds.

## 4. Attendance Flow

1. Instructor logs in and generates QR code.
2. Student logs in and opens scanner page.
3. Student scans QR code.
4. Frontend sends QR data + student/device info to backend.
5. Backend verifies:
   - session exists
   - QR not expired
   - student exists
   - device matches registered device
6. If valid, attendance is inserted into database.

## 5. Device Binding (Important Feature)

- Device ID is captured from frontend using `navigator.userAgent`.
- On first login, backend stores `device_id`.
- On every next login and attendance verification:
  - current device is compared with stored `device_id`
  - mismatch causes rejection

## 6. Database Design (MySQL)

### Students

- `id` (PK)
- `name`
- `email` (unique)
- `password_hash`
- `device_id`
- `role` (VARCHAR(20) DEFAULT 'student') - Role-based authentication: 'student' or 'instructor'

### Sessions

- `session_id` (PK)
- `course_id`
- `created_at` (timestamp)

### Attendance

- `id` (PK)
- `student_id`
- `session_id`
- `date`
- `status`
- unique constraint on (`student_id`, `session_id`) to prevent duplicate attendance

## 7. Frontend Pages

- `/register` → Student registration form (assigns 'student' role)
- `/login` → Login form with device binding and role-based routing
- `/dashboard` → **Instructor only** - QR generation panel
- `/scan` → **Student only** - QR scanner page

### Role-Based Routing

After successful login:
- **Instructors** are automatically redirected to `/dashboard`
- **Students** are automatically redirected to `/scan`
- Role is stored in localStorage for frontend access control

## 8. API Routes

- `/api/register` → Register user with hashed password (assigns 'student' role)
- `/api/login` → Login + device binding + role fetching from database
- `/api/generateQR` → **Instructor only** - Create session + generate QR image
- `/api/verifyQR` → **Student only** - Validate QR + device + insert attendance

### API Security

- **Role-based access control** enforced on protected endpoints
- Instructor endpoints require `role = 'instructor'`
- Student endpoints require `role = 'student'`
- All endpoints validate user authentication and role before processing

## 9. Security Features

- **Role-based authentication** with database-driven roles
- bcrypt-based password hashing
- UUID session IDs
- QR expiry validation (30 seconds)
- strict device binding checks
- duplicate attendance prevention using DB unique constraint
- API endpoint protection based on user roles
- Frontend route protection with role verification

## 10. Complete Output Included

This project includes:

- frontend pages
- backend API routes
- MySQL connection layer
- QR generation and QR scanning flow
- device binding logic
- beginner-friendly comments in code

## 11. Local Setup and Run

### Install dependencies

```bash
npm install
```

### Configure environment

Create/update `.env.local`:

```env
DB_HOST=localhost
DB_USER=attendance_user
DB_PASSWORD=StrongPass123!
DB_NAME=qr_attendance
DB_PORT=3306
```

Instructor accounts are created using the `scripts/fix-instructor.js` script or manually in MySQL with `role = 'instructor'`.

### Setup database

Option A:

```bash
npm run setup-db
```

Option B:

- Create DB manually in MySQL
- Run `schema.sql`

### Create Instructor Account

```bash
node scripts/fix-instructor.js
```

This creates an instructor account: `instructor@gmail.com` / `Instructor@123`

### Start app

```bash
npm run dev
```

Open `http://localhost:3000` (or 3001 if 3000 is busy).

## 12. Bonus Features Added

- **Role-based authentication system** with database-driven roles
- Basic error handling in all APIs
- Success/failure messages in UI
- Duplicate attendance prevention
- Scan throttling to avoid repeated QR submits
- **Role-based access control** for instructor/student flows
- **Automatic role-based routing** after login
- **API endpoint protection** based on user roles
- **Frontend access control** with localStorage role verification
