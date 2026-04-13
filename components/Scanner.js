"use client";

// Scanner component using html5-qrcode camera stream only.
// Note: Image upload scanning is intentionally not implemented for security.
import { useEffect, useRef, useState } from "react";

export default function Scanner({ onScan }) {
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ text: "", time: 0 });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let qrScanner;

    async function startScanner() {
      try {
        // Dynamic import avoids browser-only package issues during rendering.
        const { Html5Qrcode } = await import("html5-qrcode");
        qrScanner = new Html5Qrcode("qr-reader");
        scannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            // Ignore repeated reads of the same QR within a short window.
            const now = Date.now();
            const isDuplicate =
              decodedText === lastScanRef.current.text &&
              now - lastScanRef.current.time < 3000;
            if (isDuplicate) {
              return;
            }
            lastScanRef.current = { text: decodedText, time: now };
            onScan(decodedText);
          }
        );
        if (mounted) {
          setIsReady(true);
          setError("");
        }
      } catch (error) {
        if (mounted) {
          setIsReady(false);
          setError("Unable to start camera scanner. Check camera permission.");
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => null);
      }
      scannerRef.current?.clear().catch(() => null);
    };
  }, [onScan]);

  return (
    <div className="stack">
      <div id="qr-reader" />
      {!isReady && <p>Initializing camera scanner...</p>}
      {error && <div className="message error">{error}</div>}
    </div>
  );
}
