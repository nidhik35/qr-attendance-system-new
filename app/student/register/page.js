"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell, { FooterLink } from "../../../components/PageShell";

export default function StudentRegisterPage() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);
      if (response.ok) setTimeout(() => router.push("/student/login"), 1500);
    } catch (error) {
      setIsError(true);
      setMessage("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Student Registration"
      subtitle="Create your account to start marking attendance."
      badge="New Student"
      badgeClass="badge-student"
      footer={
        <>
          <FooterLink href="/student/login">Already registered? Login</FooterLink>
          <FooterLink href="/">Back to home</FooterLink>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit}>
        <label>Name<input name="name" placeholder="Full name" onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required disabled={isLoading} /></label>
        <label>Email<input name="email" type="email" placeholder="Email address" onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required disabled={isLoading} /></label>
        <label>Password<input name="password" type="password" placeholder="Password" onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} required disabled={isLoading} /></label>
        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? "Creating..." : "Register"}</button>
      </form>
      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
