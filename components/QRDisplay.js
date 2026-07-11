"use client";

// Presentational component for showing the generated QR image.
export default function QRDisplay({ qrImage, session }) {
  if (!qrImage) {
    return (
      <div className="qr-panel">
        <p className="muted">No active QR. Click generate to create one.</p>
      </div>
    );
  }

  return (
    <div className="qr-panel stack">
      <img src={qrImage} alt="Attendance QR Code" />
      <small>Session: {session?.session_id?.slice(0, 8)}...</small>
      <small className="muted">Students must scan within 30 seconds</small>
    </div>
  );
}
