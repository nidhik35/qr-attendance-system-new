// Root layout shared by all App Router pages.
import "./globals.css";

export const metadata = {
  title: "Secure QR Attendance",
  description: "QR code based attendance system"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
