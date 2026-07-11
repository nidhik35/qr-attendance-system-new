"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Scanner from "../../../components/Scanner";
import FaceCapture from "../../../components/FaceCapture";
import PageShell, { FooterLink } from "../../../components/PageShell";
import { authFetch, logoutSession } from "../../../lib/clientAuth";

function readUserFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function StudentScanPage() {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFace, setHasFace] = useState(true);
  const [challengeToken, setChallengeToken] = useState(null);
  const [showFaceStep, setShowFaceStep] = useState(false);
  const router = useRouter();
  const user = useMemo(() => readUserFromStorage(), []);

  useEffect(() => {
    if (!user?.id || user.role !== "student") {
      router.push("/student/login");
      return;
    }
    authFetch("/api/face/status")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasFace) {
          setHasFace(false);
          router.push("/student/face-setup");
        }
      });
  }, [router, user]);

  const submitAttendance = useCallback(
    async (attendanceChallengeToken, facePayload) => {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000
        });
      });

      const response = await authFetch("/api/verifyQR", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_challenge_token: attendanceChallengeToken,
          liveness_token: facePayload.liveness_token,
          device_id: navigator.userAgent,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          face_descriptor: facePayload.face_descriptor
        })
      });
      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
    },
    []
  );

  const handleScan = useCallback(
    async (decodedText) => {
      if (isSubmitting || showFaceStep) return;
      try {
        const payload = JSON.parse(decodedText);
        if (!payload.session_id || !payload.timestamp || !payload.nonce || !payload.signature) {
          setIsError(true);
          setMessage("Invalid QR — missing security fields.");
          return;
        }

        setIsSubmitting(true);
        const challengeRes = await authFetch("/api/qr/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            device_id: navigator.userAgent
          })
        });
        const challengeData = await challengeRes.json();

        if (!challengeRes.ok) {
          setIsError(true);
          setMessage(challengeData.message || "QR validation failed.");
          return;
        }

        setChallengeToken(challengeData.attendance_challenge_token);
        setShowFaceStep(true);
        setMessage("QR validated. Complete liveness check to mark attendance.");
        setIsError(false);
      } catch {
        setIsError(true);
        setMessage("Invalid QR format.");
      } finally {
        setTimeout(() => setIsSubmitting(false), 1000);
      }
    },
    [isSubmitting, showFaceStep]
  );

  const handleFaceVerified = useCallback(
    async (facePayload) => {
      if (!challengeToken) return;
      setIsSubmitting(true);
      try {
        await submitAttendance(challengeToken, facePayload);
        setShowFaceStep(false);
        setChallengeToken(null);
      } catch (error) {
        setIsError(true);
        setMessage(error?.code === 1 ? "Location permission denied." : "Attendance submission failed.");
      } finally {
        setTimeout(() => setIsSubmitting(false), 2000);
      }
    },
    [challengeToken, submitAttendance]
  );

  const handleLogout = async () => {
    await logoutSession();
    router.push("/");
  };

  if (!hasFace) {
    return (
      <PageShell title="Redirecting" subtitle="Setting up face profile..." badge="Student" badgeClass="badge-student">
        <p className="muted">Please wait...</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Mark Attendance"
      subtitle={showFaceStep ? "Step 2: Liveness + face verification" : "Step 1: Scan instructor QR code"}
      badge="Student Scanner"
      badgeClass="badge-student"
      footer={
        <>
          <button type="button" className="btn-danger" onClick={handleLogout}>Logout</button>
          <FooterLink href="/student/history">Attendance history</FooterLink>
          <FooterLink href="/">Home</FooterLink>
        </>
      }
    >
      {user?.name && <div className="user-chip">Hello, <strong>{user.name}</strong></div>}

      {!showFaceStep ? (
        <div className="card stack scanner-box">
          <Scanner onScan={handleScan} />
          {isSubmitting && <p className="muted">Validating QR...</p>}
          <small className="muted">Signed QR only. Screenshots cannot be forwarded to another device.</small>
        </div>
      ) : (
        <div className="card stack">
          <h3>Liveness + Face Verification</h3>
          <FaceCapture
            livenessMode
            onDescriptor={handleFaceVerified}
            buttonLabel="Start Liveness Check"
          />
        </div>
      )}

      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
