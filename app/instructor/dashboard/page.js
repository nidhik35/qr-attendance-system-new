"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRDisplay from "../../../components/QRDisplay";
import PageShell, { FooterLink } from "../../../components/PageShell";
import { logoutSession, getAuthHeaders } from "../../../lib/clientAuth";

function readUserFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function InstructorDashboardPage() {
  const [qrImage, setQrImage] = useState("");
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("CSE101");
  const router = useRouter();
  const user = useMemo(() => readUserFromStorage(), []);

  useEffect(() => {
    const activeUser = readUserFromStorage();
    if (!activeUser?.id || activeUser?.role !== "instructor") {
      router.push("/instructor/login");
      return;
    }
    fetch("/api/courses", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.courses?.length) {
          setCourses(data.courses);
          setSelectedCourse(data.courses[0].course_code);
        }
      });
  }, [router]);

  const generateQR = useCallback(async () => {
    try {
      const response = await fetch("/api/generateQR", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ course_id: selectedCourse })
      });
      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
      if (response.ok) {
        setQrImage(data.qrImage);
        setSession(data.session);
        setCountdown(30);
        setIsError(false);
        setMessage("QR generated successfully");
      }
    } catch {
      setIsError(true);
      setMessage("Could not generate QR.");
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (!qrImage || countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrImage("");
          setSession(null);
          setIsError(true);
          setMessage("QR code expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrImage, countdown]);

  return (
    <PageShell
      title="Instructor Dashboard"
      subtitle="Generate secure attendance QR codes for your active class session."
      badge="Live Session"
      badgeClass="badge-instructor"
      wide
      footer={
        <>
          <button type="button" className="btn-danger" onClick={async () => { await logoutSession(); router.push("/"); }}>Logout</button>
          <FooterLink href="/">Back to home</FooterLink>
        </>
      }
    >
      {user?.name && <div className="user-chip">Logged in as <strong>{user.name}</strong></div>}

      <div className="card stack">
        <label>
          Select Course
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            {courses.length === 0 ? (
              <option value="CSE101">CSE101</option>
            ) : (
              courses.map((course) => (
                <option key={course.id} value={course.course_code}>
                  {course.course_code} - {course.course_name}
                </option>
              ))
            )}
          </select>
        </label>
        <button type="button" className="btn-primary" onClick={generateQR}>Generate New QR Code</button>
        {qrImage ? <span className="timer-pill">Expires in {countdown}s</span> : <span className="muted">No active QR</span>}
        <QRDisplay qrImage={qrImage} session={session} />
      </div>

      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
