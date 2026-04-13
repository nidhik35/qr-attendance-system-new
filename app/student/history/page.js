"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentHistoryPage() {
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const user = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      router.push("/student/login");
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/attendanceHistory?student_id=${user.id}`);
        const data = await response.json();
        if (!response.ok) {
          setIsError(true);
          setMessage(data.message || "Could not load attendance history.");
          return;
        }
        setRecords(data.attendance || []);
      } catch (error) {
        setIsError(true);
        setMessage("Unable to load attendance history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [router, user]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  return (
    <main className="container">
      <h1>Attendance History</h1>
      <p>Review your attendance records for past sessions.</p>

      {user?.name && (
        <p style={{ marginBottom: "1rem", color: "#333" }}>
          Logged in as <strong>{user.name}</strong>
        </p>
      )}

      {isLoading ? (
        <p>Loading attendance history...</p>
      ) : (
        <div className="stack">
          {records.length === 0 ? (
            <p>No attendance records found yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Course</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Session</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={`${record.session_id}-${record.date}`}>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      {record.course_id || "Unknown"}
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      {record.session_id}
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      {record.status}
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      {new Date(record.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="stack" style={{ marginTop: "2rem" }}>
        <button onClick={handleLogout} className="btn secondary">Logout</button>
        <a href="/student/scan" className="btn secondary">← Back to Scanner</a>
        <a href="/" className="btn secondary">← Home</a>
      </div>
    </main>
  );
}
