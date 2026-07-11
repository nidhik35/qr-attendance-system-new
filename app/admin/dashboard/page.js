"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell, { FooterLink } from "../../../components/PageShell";
import { authFetch, logoutSession, getAuthHeaders } from "../../../lib/clientAuth";

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "admin") {
      router.push("/admin/login");
      return;
    }

    authFetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((data) => {
        if (!data.summary) {
          setIsError(true);
          setMessage(data.message || "Failed to load analytics");
          return;
        }
        setAnalytics(data);
      })
      .catch(() => {
        setIsError(true);
        setMessage("Unable to load analytics");
      });
  }, [router]);

  const download = async (url, filename) => {
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      setIsError(true);
      setMessage("Export failed");
      return;
    }
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
  };

  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Monitor attendance health, trends, and export reports."
      badge="Analytics Center"
      badgeClass="badge-admin"
      wide
      footer={
        <>
          <button type="button" className="btn-danger" onClick={async () => { await logoutSession(); router.push("/"); }}>Logout</button>
          <FooterLink href="/docs">Swagger UI</FooterLink>
          <FooterLink href="/">Home</FooterLink>
        </>
      }
    >
      {analytics && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><strong>{analytics.summary.total_students}</strong><span>Students</span></div>
            <div className="stat-card"><strong>{analytics.summary.total_instructors}</strong><span>Instructors</span></div>
            <div className="stat-card"><strong>{analytics.summary.total_sessions}</strong><span>Sessions</span></div>
            <div className="stat-card"><strong>{analytics.summary.total_attendance}</strong><span>Attendance</span></div>
          </div>

          <div className="card" style={{ marginTop: "14px" }}>
            <h3>Course-wise Attendance</h3>
            {analytics.courseStats.map((course) => (
              <p key={course.course_id} className="muted">
                {course.course_id}: {course.present_count} present / {course.sessions_count} sessions
              </p>
            ))}
          </div>

          <div className="card" style={{ marginTop: "14px" }}>
            <h3>Low Attendance (&lt; 50%)</h3>
            {analytics.lowAttendance.length === 0 ? (
              <p className="muted">No low attendance students.</p>
            ) : (
              analytics.lowAttendance.map((student) => (
                <p key={student.id}>
                  {student.name} ({student.email}) - {student.attendance_percentage ?? 0}%
                </p>
              ))
            )}
          </div>
          <div className="card" style={{ marginTop: "14px" }}>
            <h3>Security Audit Log (recent)</h3>
            {analytics.auditSummary?.length > 0 && (
              <p className="muted">
                Last 7 days:{" "}
                {analytics.auditSummary.map((s) => `${s.status}: ${s.count}`).join(" · ")}
              </p>
            )}
            {(!analytics.auditLogs || analytics.auditLogs.length === 0) ? (
              <p className="muted">No audit events yet.</p>
            ) : (
              <div className="stack" style={{ maxHeight: "320px", overflowY: "auto" }}>
                {analytics.auditLogs.map((log) => (
                  <p key={log.id} className="muted" style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>{log.status}</strong> · {log.action}
                    {log.user_name ? ` · ${log.user_name}` : ""}
                    {log.resource ? ` · ${log.resource.slice(0, 8)}…` : ""}
                    · {new Date(log.created_at).toLocaleString()}
                    {log.ip_address ? ` · ${log.ip_address}` : ""}
                  </p>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="stack" style={{ marginTop: "14px" }}>
        <button type="button" className="btn-primary" onClick={() => download("/api/admin/export", "attendance-export.csv")}>Export CSV</button>
        <button type="button" className="btn-secondary" onClick={() => download("/api/admin/export-pdf", "attendance-report.html")}>Export Printable Report</button>
      </div>

      {message && <div className={`message ${isError ? "error" : "success"}`}>{message}</div>}
    </PageShell>
  );
}
