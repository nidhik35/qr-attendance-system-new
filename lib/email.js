// Optional email notifications using Nodemailer.
import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendAttendanceConfirmation({ to, name, courseCode }) {
  const transporter = getTransporter();
  if (!transporter || !to) {
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "attendance@college.local",
    to,
    subject: "Attendance Marked Successfully",
    text: `Hello ${name},\n\nYour attendance was marked for course ${courseCode || "N/A"}.\n\n- QR Attendance System`
  });
}

export async function sendLowAttendanceWarning({ to, name, percentage }) {
  const transporter = getTransporter();
  if (!transporter || !to) {
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "attendance@college.local",
    to,
    subject: "Low Attendance Warning",
    text: `Hello ${name},\n\nYour attendance is currently ${percentage}%.\nPlease improve attendance to avoid academic penalties.\n\n- QR Attendance System`
  });
}
