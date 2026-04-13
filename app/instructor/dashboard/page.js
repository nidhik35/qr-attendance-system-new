"use client";

// Instructor dashboard for generating and refreshing session QR codes.
// Role-based authentication: Only instructors can access this page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRDisplay from "../../../components/QRDisplay";

export default function InstructorDashboardPage() {
  const [qrImage, setQrImage] = useState("");
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();

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
    // Instructor page access: allow if user session is instructor
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id || (user?.role !== "instructor" && user?.sessionRole !== "instructor")) {
      router.push("/instructor/login");
      return;
    }
  }, [router]);

  const generateQR = useCallback(async () => {
    try {
      // Role-based authentication: Verify instructor role before API call
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user?.id || (user?.role !== "instructor" && user?.sessionRole !== "instructor")) {
        setIsError(true);
        setMessage("Access denied. Instructor login required.");
        router.push("/instructor/login");
        return;
      }

      const response = await fetch("/api/generateQR", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          course_id: "CSE101"
        })
      });

      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);

      if (response.ok) {
        setQrImage(data.qrImage);
        setSession(data.session);
        setCountdown(30);
      }
    } catch (error) {
      setIsError(true);
      setMessage("Could not generate QR.");
    }
  }, [router]);

  useEffect(() => {
    generateQR();
    const interval = setInterval(generateQR, 30 * 1000);
    return () => clearInterval(interval);
  }, [generateQR]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="container">
      <h1>Instructor Dashboard</h1>
      <p>Welcome to the QR Attendance System</p>
      {user?.name && (
        <p style={{ marginBottom: "1rem", color: "#333" }}>
          Logged in as <strong>{user.name}</strong> ({user.sessionRole === "instructor" ? "Instructor session" : user.role})
        </p>
      )}

      <div className="stack">
        <button onClick={generateQR}>Generate New QR Code</button>
        <p>Auto refresh in: {countdown}s</p>
        <QRDisplay qrImage={qrImage} session={session} />
      </div>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <button onClick={handleLogout} className="btn secondary">Logout</button>
        <a href="/instructor/login" className="btn secondary">← Back to Login</a>
        <a href="/" className="btn secondary">← Home</a>
      </div>
    </main>
  );
}