"use client";

// Instructor login page - separate from student login for role-based authentication.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InstructorLoginPage() {
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
        role: "instructor",
        loginType: "instructor", // Allow any registered user to authenticate here
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
        const userSession = {
          ...data.user,
          sessionRole: data.sessionRole || "instructor"
        };
        // Treat this session as instructor access
        localStorage.setItem("user", JSON.stringify(userSession));
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
    <main className="container">
      <h1>Instructor Login</h1>
      <p>Login to access the instructor dashboard</p>

      <form className="stack" onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Instructor Email"
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
          {isLoading ? "Logging in..." : "Login as Instructor"}
        </button>
      </form>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <a href="/" className="btn secondary">← Back to Home</a>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Don't have an instructor account? Contact your administrator.
        </p>
      </div>
    </main>
  );
}