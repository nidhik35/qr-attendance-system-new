"use client";

// Instructor registration page - separate from student registration.
import { useState } from "react";
import { useRouter } from "next/navigation";

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
        setTimeout(() => {
          router.push("/instructor/login");
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
      <h1>Instructor Registration</h1>
      <p>Create your instructor account</p>

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
          {isLoading ? "Creating Account..." : "Register as Instructor"}
        </button>
      </form>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <a href="/instructor/login" className="btn secondary">Already have an account? Login</a>
        <a href="/" className="btn secondary">← Back to Home</a>
      </div>
    </main>
  );
}
