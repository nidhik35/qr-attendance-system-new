"use client";

import { useState } from "react";

export default function CourseForm({ onClose, onSuccess, getAuthHeaders }) {
  const [formData, setFormData] = useState({
    course_name: "",
    course_code: "",
    semester: "",
    section: ""
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      setIsError(!response.ok);
      setMessage(data.message);

      if (response.ok) {
        setFormData({ course_name: "", course_code: "", semester: "", section: "" });
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 1000);
      }
    } catch (error) {
      setIsError(true);
      setMessage("Failed to create course. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Course</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Course Name *
            <input
              name="course_name"
              placeholder="e.g., Data Structures"
              value={formData.course_name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Course Code *
            <input
              name="course_code"
              placeholder="e.g., CS101"
              value={formData.course_code}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Semester *
            <input
              name="semester"
              placeholder="e.g., Fall 2024 or 3"
              value={formData.semester}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Section (Optional)
            <input
              name="section"
              placeholder="e.g., A, B1, or 001"
              value={formData.section}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>

          <div className="button-group">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Course"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>

        {message && (
          <div className={`message ${isError ? "error" : "success"}`}>
            {message}
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 90%;
          padding: 24px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          color: #666;
        }

        .btn-close:hover {
          color: #000;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .button-group button {
          flex: 1;
        }

        @media (max-width: 600px) {
          .modal-content {
            width: 95%;
            padding: 16px;
          }

          .modal-header h2 {
            font-size: 1.25rem;
          }

          .button-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
