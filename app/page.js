"use client";

// Home page with role-based navigation - separate flows for students and instructors.
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Secure QR Attendance System</h1>
      <p>Choose your role to get started:</p>

      <div className="stack">
        <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h2>👨‍🎓 Student</h2>
          <p>Register or login to scan QR codes for attendance</p>
          <div className="stack" style={{ gap: "0.5rem" }}>
            <Link href="/student/register" className="btn">Student Register</Link>
            <Link href="/student/login" className="btn secondary">Student Login</Link>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px" }}>
          <h2>👨‍🏫 Instructor</h2>
          <p>Register or login to generate QR codes and manage attendance</p>
          <div className="stack" style={{ gap: "0.5rem" }}>
            <Link href="/instructor/register" className="btn">Instructor Register</Link>
            <Link href="/instructor/login" className="btn secondary">Instructor Login</Link>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
        <h3>ℹ️ How it works:</h3>
        <ol style={{ textAlign: "left", margin: "1rem 0" }}>
          <li><strong>Students:</strong> Register → Login → Scan QR codes for attendance</li>
          <li><strong>Instructors:</strong> Login → Generate QR codes → Students scan to mark attendance</li>
        </ol>
      </div>
    </main>
  );
}
