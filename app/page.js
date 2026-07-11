"use client";

import Link from "next/link";
import PageShell, { FooterLink } from "../components/PageShell";

export default function HomePage() {
  return (
    <PageShell
      title="Secure QR Attendance"
      subtitle="Fast, secure, role-based attendance with QR, face verification, and live location checks."
      badge="College Attendance Platform"
      wide
    >
      <div className="grid-roles">
        <article className="role-card">
          <span className="badge badge-student">Student</span>
          <h2>Mark Attendance</h2>
          <p>Register, complete face setup, and scan instructor QR codes.</p>
          <div className="stack">
            <Link href="/student/register" className="btn btn-primary">Register</Link>
            <Link href="/student/login" className="btn btn-secondary">Login</Link>
          </div>
        </article>

        <article className="role-card">
          <span className="badge badge-instructor">Instructor</span>
          <h2>Generate QR</h2>
          <p>Create time-limited session QR codes for your class.</p>
          <div className="stack">
            <Link href="/instructor/login" className="btn btn-primary">Instructor Login</Link>
          </div>
        </article>

        <article className="role-card">
          <span className="badge badge-admin">Admin</span>
          <h2>Analytics</h2>
          <p>View reports, export data, and explore API documentation.</p>
          <div className="stack">
            <Link href="/admin/login" className="btn btn-primary">Admin Login</Link>
            <Link href="/docs" className="btn btn-secondary">API Docs</Link>
          </div>
        </article>
      </div>

      <div className="info-box">
        <h3>How it works</h3>
        <ol>
          <li>Instructor generates a QR valid for 30 seconds.</li>
          <li>Student scans QR, verifies face, and shares location.</li>
          <li>System marks attendance only if all security checks pass.</li>
        </ol>
      </div>
    </PageShell>
  );
}
