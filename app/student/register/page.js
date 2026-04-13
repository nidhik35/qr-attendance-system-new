"use client";

// Student registration page - only students can register via frontend.
// Role-based authentication: All registrations are assigned 'student' role.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentRegisterPage() {
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
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);

      if (response.ok) {
        // Registration successful, redirect to student login
        setTimeout(() => {
          router.push("/student/login");
        }, 2000);
      }
    } catch (error) {
      setIsError(true);
      setMessage("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>Student Registration</h1>
      <p>Create your student account</p>

      <form className="stack" onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Full Name"
          onChange={handleChange}
          required
          disabled={isLoading}
        />
        <input
          name="email"
          type="email"
          placeholder="Email Address"
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
          {isLoading ? "Creating Account..." : "Register as Student"}
        </button>
      </form>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <a href="/student/login" className="btn secondary">Already have an account? Login</a>
        <a href="/" className="btn secondary">← Back to Home</a>
      </div>
    </main>
  );
}