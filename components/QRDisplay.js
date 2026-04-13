"use client";

// Presentational component for showing the generated QR image.
export default function QRDisplay({ qrImage, session }) {
  if (!qrImage) {
    return <p>No active QR yet.</p>;
  }

  return (
    <div className="stack">
      <img src={qrImage} alt="Attendance QR Code" />
      <small>Session ID: {session?.session_id}</small>
      <small>Timestamp: {session?.timestamp}</small>
    </div>
  );
}
