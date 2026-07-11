"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell, { FooterLink } from "../../../components/PageShell";

export default function InstructorRegisterPage() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role: "instructor" })
      });

      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);

      if (response.ok) {
        setTimeout(() => router.push("/instructor/login"), 2000);
      }
    } catch {
      setIsError(true);
      setMessage("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Instructor Registration"
      subtitle="Create an instructor account to generate session QR codes."
      badge="Instructor Portal"
      badgeClass="badge-instructor"
      footer={
        <>
          <FooterLink href="/instructor/login">Already have an account? Login</FooterLink>
          <FooterLink href="/">Back to home</FooterLink>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Full name
          <input name="name" placeholder="Jane Doe" onChange={handleChange} required disabled={isLoading} />
        </label>
        <label>
          Email
          <input name="email" type="email" placeholder="instructor@college.com" onChange={handleChange} required disabled={isLoading} />
        </label>
        <label>
          Password
          <input name="password" type="password" placeholder="Strong password" onChange={handleChange} required disabled={isLoading} />
        </label>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Register as instructor"}
        </button>
      </form>

      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
