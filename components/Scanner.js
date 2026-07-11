"use client";

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
        const { Html5Qrcode } = await import("html5-qrcode");
        qrScanner = new Html5Qrcode("qr-reader");
        scannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            const now = Date.now();
            const isDuplicate =
              decodedText === lastScanRef.current.text &&
              now - lastScanRef.current.time < 3000;

            if (isDuplicate) return;

            lastScanRef.current = { text: decodedText, time: now };
            if (onScan) onScan(decodedText);
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

      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      }
    };
  }, [onScan]);

  return (
    <div className="stack">
      <div className="scanner-box">
        <div id="qr-reader" />
        {!isReady && !error && (
          <div className="scanner-overlay">
            <span className="spinner" aria-hidden />
            <p>Starting camera...</p>
          </div>
        )}
      </div>
      {error && <div className="message error">{error}</div>}
    </div>
  );
}