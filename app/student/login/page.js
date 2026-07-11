"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuthSession } from "../../../lib/clientAuth";
import PageShell, { FooterLink } from "../../../components/PageShell";

export default function StudentLoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role: "student",
          device_id: navigator.userAgent || "mobile-device"
        })
      });

      const data = await response.json();
      setIsError(!data.success);
      setMessage(data.message || "Login failed");

      if (data.success) {
        saveAuthSession(data);
        const faceStatus = await fetch("/api/face/status", {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json"
          }
        });
        const faceData = await faceStatus.json();
        router.push(faceStatus.ok && !faceData.hasFace ? "/student/face-setup" : "/student/scan");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Student Login"
      subtitle="Sign in to scan attendance QR codes."
      badge="Student Portal"
      badgeClass="badge-student"
      footer={
        <>
          <FooterLink href="/student/register">Create account</FooterLink>
          <FooterLink href="/">Back to home</FooterLink>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" placeholder="student@college.com" onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required disabled={isLoading} />
        </label>
        <label>
          Password
          <input name="password" type="password" placeholder="Enter password" onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} required disabled={isLoading} />
        </label>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
