"use client";

// Student page for scanning QR and submitting attendance.
// Role-based authentication: Only students can access this page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Scanner from "../../../components/Scanner";

export default function StudentScanPage() {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Role-based authentication: Get user from localStorage
  const user = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  useEffect(() => {
    // Role-based authentication: Redirect based on authentication and role
    if (!user?.id) {
      router.push("/student/login");
      return;
    }
    const isStudentSession = user.role === "student" && user.sessionRole !== "instructor";
    if (!isStudentSession) {
      router.push("/instructor/dashboard"); // Instructor sessions go to instructor login/dashboard
    }
  }, [router, user]);

  const handleScan = useCallback(async (decodedText) => {
    if (isSubmitting) {
      return;
    }

    try {
      // Role-based authentication: Verify student role before processing scan
      if (!user?.id) {
        setIsError(true);
        setMessage("Please login first.");
        router.push("/student/login");
        return;
      }

      const isStudentSession = user.role === "student" && user.sessionRole !== "instructor";
      if (!isStudentSession) {
        setIsError(true);
        setMessage("Access denied. Student login required.");
        router.push("/instructor/dashboard");
        return;
      }

      setIsSubmitting(true);
      const payload = JSON.parse(decodedText);
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000
        });
      });

      const response = await fetch("/api/verifyQR", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: payload.session_id,
          timestamp: payload.timestamp,
          student_id: user.id,
          device_id: navigator.userAgent,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      });

      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
    } catch (error) {
      setIsError(true);
      if (error?.code === 1) {
        setMessage("Location permission denied. Attendance cannot be marked.");
      } else {
        setMessage("Invalid QR format or verification error.");
      }
    } finally {
      setTimeout(() => setIsSubmitting(false), 2000);
    }
  }, [isSubmitting, router, user]);

  return (
    <main className="container">
      <h1>Scan Attendance QR</h1>
      <p>Welcome to the QR Attendance System</p>
      {user?.name && (
        <p style={{ marginBottom: "1rem", color: "#333" }}>
          Logged in as <strong>{user.name}</strong> ({user.role === "student" ? "Student" : user.role})
        </p>
      )}

      <div className="stack">
        <Scanner onScan={handleScan} />
        {isSubmitting && <p>Submitting attendance...</p>}
        <small>Live camera scanning only. Image upload is disabled.</small>
      </div>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <button onClick={handleLogout} className="btn secondary">Logout</button>
        <a href="/student/history" className="btn secondary">View Attendance History</a>
        <a href="/student/login" className="btn secondary">← Back to Login</a>
        <a href="/" className="btn secondary">← Home</a>
      </div>
    </main>
  );
}