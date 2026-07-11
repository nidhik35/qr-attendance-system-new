"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell, { FooterLink } from "../../../components/PageShell";
import { logoutSession, getAuthHeaders } from "../../../lib/clientAuth";

export default function StudentHistoryPage() {
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      router.push("/student/login");
      return;
    }
    fetch("/api/attendanceHistory", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!data.attendance) {
          setIsError(true);
          setMessage(data.message || "Could not load history");
          return;
        }
        setRecords(data.attendance);
      })
      .catch(() => {
        setIsError(true);
        setMessage("Unable to load attendance history");
      })
      .finally(() => setIsLoading(false));
  }, [router, user]);

  return (
    <PageShell
      title="Attendance History"
      subtitle="Track your previous session attendance records."
      badge="Student Records"
      badgeClass="badge-student"
      wide
      footer={
        <>
          <button type="button" className="btn-danger" onClick={async () => { await logoutSession(); router.push("/"); }}>Logout</button>
          <FooterLink href="/student/scan">Back to scanner</FooterLink>
          <FooterLink href="/">Home</FooterLink>
        </>
      }
    >
      {user?.name && <div className="user-chip">Student: <strong>{user.name}</strong></div>}

      {isLoading ? (
        <p className="muted">Loading attendance history...</p>
      ) : records.length === 0 ? (
        <div className="card"><p className="muted">No attendance records yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Session</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={`${record.session_id}-${record.date}`}>
                  <td>{record.course_id || "N/A"}</td>
                  <td>{String(record.session_id).slice(0, 10)}...</td>
                  <td>{record.status}</td>
                  <td>{new Date(record.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
