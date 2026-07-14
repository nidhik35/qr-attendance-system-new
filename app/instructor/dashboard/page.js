"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRDisplay from "../../../components/QRDisplay";
import CourseForm from "../../../components/CourseForm";
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
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const router = useRouter();
  const user = useMemo(() => readUserFromStorage(), []);

  const loadCourses = useCallback(() => {
    setIsLoadingCourses(true);
    fetch("/api/courses", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.courses?.length) {
          setCourses(data.courses);
          setSelectedCourseId(data.courses[0].id);
          setMessage("");
          setIsError(false);
        } else {
          setCourses([]);
          setSelectedCourseId("");
          setMessage("No courses found. Create a course to get started.");
          setIsError(true);
        }
      })
      .catch(() => {
        setMessage("Failed to load courses");
        setIsError(true);
      })
      .finally(() => {
        setIsLoadingCourses(false);
      });
  }, []);

  useEffect(() => {
    const activeUser = readUserFromStorage();
    if (!activeUser?.id || activeUser?.role !== "instructor") {
      router.push("/instructor/login");
      return;
    }
    loadCourses();
  }, [router, loadCourses]);

  const generateQR = useCallback(async () => {
    if (!selectedCourseId) {
      setMessage("Please select a course");
      setIsError(true);
      return;
    }

    try {
      const response = await fetch("/api/generateQR", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ course_id: selectedCourseId })
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
  }, [selectedCourseId]);

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
        <div className="courses-header">
          <h3 style={{ margin: 0 }}>Course Management</h3>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCourseForm(true)}>
            + Create Course
          </button>
        </div>

        {isLoadingCourses ? (
          <p className="muted">Loading courses...</p>
        ) : (
          <>
            <label>
              Select Course
              <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} disabled={courses.length === 0}>
                <option value="">-- Select a course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                    {course.semester && ` (${course.semester}${course.section ? ` - ${course.section}` : ""})`}
                  </option>
                ))}
              </select>
            </label>
            {courses.length === 0 && (
              <p className="muted">No courses available. Click "Create Course" to get started.</p>
            )}
            <button type="button" className="btn-primary" onClick={generateQR} disabled={!selectedCourseId || isLoadingCourses}>
              Generate New QR Code
            </button>
            {qrImage ? <span className="timer-pill">Expires in {countdown}s</span> : <span className="muted">No active QR</span>}
            <QRDisplay qrImage={qrImage} session={session} />
          </>
        )}
      </div>

      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}

      {showCourseForm && (
        <CourseForm
          onClose={() => setShowCourseForm(false)}
          onSuccess={loadCourses}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      <style jsx>{`
        .courses-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.9rem;
        }

        @media (max-width: 600px) {
          .courses-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .courses-header button {
            width: 100%;
          }
        }
      `}</style>
    </PageShell>
  );
}
