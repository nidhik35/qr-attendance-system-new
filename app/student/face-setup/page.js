"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FaceCapture from "../../../components/FaceCapture";
import PageShell, { FooterLink } from "../../../components/PageShell";
import { getAuthHeaders } from "../../../lib/clientAuth";

export default function FaceSetupPage() {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?.id || user.role !== "student") {
      router.push("/student/login");
    }
  }, [router]);

  const saveFace = async (descriptor) => {
    try {
      const response = await fetch("/api/face/register", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ face_descriptor: descriptor })
      });
      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
      if (response.ok) setTimeout(() => router.push("/student/scan"), 800);
    } catch {
      setIsError(true);
      setMessage("Could not save face profile.");
    }
  };

  return (
    <PageShell
      title="Face Registration"
      subtitle="Register your face once. It will be verified before every attendance mark."
      badge="Security Setup"
      badgeClass="badge-student"
      footer={<FooterLink href="/student/login">Back to login</FooterLink>}
    >
      <div className="card">
        <FaceCapture onDescriptor={saveFace} buttonLabel="Save My Face" />
      </div>
      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
