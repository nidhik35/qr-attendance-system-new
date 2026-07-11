"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuthSession } from "../../../lib/clientAuth";
import PageShell, { FooterLink } from "../../../components/PageShell";

export default function InstructorLoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          loginType: "instructor",
          device_id: navigator.userAgent
        })
      });
      const data = await response.json();
      setIsError(!data.success);
      setMessage(data.message || "Login failed");
      if (data.success) {
        saveAuthSession(data);
        router.push("/instructor/dashboard");
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
      title="Instructor Login"
      subtitle="Access dashboard and generate class QR sessions."
      badge="Instructor Portal"
      badgeClass="badge-instructor"
      footer={<FooterLink href="/">Back to home</FooterLink>}
    >
      <form className="stack" onSubmit={handleSubmit}>
        <label>Email<input name="email" type="email" placeholder="instructor@college.com" onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required disabled={isLoading} /></label>
        <label>Password<input name="password" type="password" placeholder="Password" onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} required disabled={isLoading} /></label>
        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? "Logging in..." : "Login"}</button>
      </form>
      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
      <p className="muted">Instructor accounts are created by admin.</p>
    </PageShell>
  );
}
