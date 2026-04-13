"use client";

// Student login page - separate from instructor login for role-based authentication.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentLoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
      const payload = {
        ...formData,
        role: "student", // Explicitly set role for student login
        device_id: navigator.userAgent
      };

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setIsError(!data.success);
      setMessage(data.message || "Login failed");

      if (data.success) {
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        // Redirect to student scan page
        router.push("/student/scan");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>Student Login</h1>
      <p>Login to access the QR scanner</p>

      <form className="stack" onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Student Email"
          onChange={handleChange}
          required
          disabled={isLoading}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          required
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login as Student"}
        </button>
      </form>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <a href="/student/register" className="btn secondary">Don't have an account? Register</a>
        <a href="/" className="btn secondary">← Back to Home</a>
      </div>
    </main>
  );
}