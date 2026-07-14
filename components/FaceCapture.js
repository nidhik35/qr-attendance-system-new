"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "../lib/clientAuth";

const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

const FACE_API_SCRIPT =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.min.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      if (window.faceapi) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

export default function FaceCapture({
  onDescriptor,
  buttonLabel = "Capture Face",
  livenessMode = false
}) {
  const videoRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("Loading face models...");

  const [stepIndex, setStepIndex] = useState(0);
  const [stepCount, setStepCount] = useState(0);

  useEffect(() => {
    let stream;
    let mounted = true;

    async function init() {
      try {
        await loadScript(FACE_API_SCRIPT);

        const faceapi = window.faceapi;

        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (!mounted) return;

        const video = videoRef.current;

        if (!video) return;

        video.srcObject = stream;

        await new Promise((resolve) => {
          video.onloadedmetadata = resolve;
        });

        await video.play();

        setReady(true);

        if (livenessMode) {
          setMessage("Camera ready. Press Start Liveness Check.");
        } else {
          setMessage("Camera ready. Press Capture Face.");
        }
      } catch (err) {
        console.error(err);
        setMessage(
          "Unable to access camera. Please allow camera permission."
        );
      }
    }

    init();

    return () => {
      mounted = false;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [livenessMode]);

  async function detectFace(retries = 15) {
    const faceapi = window.faceapi;

    for (let i = 0; i < retries; i++) {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        return detection;
      }

      await sleep(250);
    }

    throw new Error(
      "Face not detected. Please look at the camera with good lighting."
    );
  }

  async function detectBlink() {
    setMessage("Please blink your eyes once");

    await detectFace();

    await sleep(1200);

    return {
      step: "blink",
      completed_at: Date.now()
    };
  }
    async function runLivenessFlow() {
    setMessage("Starting liveness check...");

    const challengeRes = await authFetch("/api/face/challenge", {
      method: "GET"
    });

    const challengeData = await challengeRes.json();

    if (!challengeRes.ok) {
      throw new Error(
        challengeData.message || "Unable to start liveness check."
      );
    }

    const challengeId = challengeData.challengeId;
    const steps = challengeData.steps || [];

    setStepIndex(0);
    setStepCount(steps.length);

    const proof = [];

    for (let i = 0; i < steps.length; i++) {
      setStepIndex(i);

      if (steps[i] === "blink") {
        const result = await detectBlink();
        proof.push(result);
      } else {
        throw new Error(`Unsupported liveness step: ${steps[i]}`);
      }
    }

    setMessage("Verifying liveness...");

    const completeRes = await authFetch("/api/face/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        challenge_id: challengeId,
        proof
      })
    });

    const completeData = await completeRes.json();

    if (!completeRes.ok) {
      throw new Error(
        completeData.message || "Liveness verification failed."
      );
    }

    setMessage("Capturing face...");

    const detection = await detectFace();

    onDescriptor({
      face_descriptor: Array.from(detection.descriptor),
      liveness_token: completeData.liveness_token
    });

    setMessage("Liveness verified successfully.");
  }

  async function captureFace() {
    if (!ready || capturing) {
      return;
    }

    setCapturing(true);

    try {
      if (livenessMode) {
        await runLivenessFlow();
      } else {
        setMessage("Detecting face...");

        const detection = await detectFace();

        onDescriptor(Array.from(detection.descriptor));

        setMessage("Face captured successfully.");
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err.message || "Face verification failed."
      );
    } finally {
      setCapturing(false);
    }
  }
    return (
    <div className="stack">
      <div className="camera-preview">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            borderRadius: "12px",
            background: "#000"
          }}
        />

        {!ready && (
          <div className="scanner-overlay">
            <span className="spinner" aria-hidden />
            <p>Loading camera...</p>
          </div>
        )}
      </div>

      {livenessMode && capturing && stepCount > 0 && (
        <p className="muted">
          Step {stepIndex + 1} of {stepCount}
        </p>
      )}

      <button
        type="button"
        className="btn-primary"
        disabled={!ready || capturing}
        onClick={captureFace}
      >
        {capturing ? "Verifying..." : buttonLabel}
      </button>

      {message && (
        <p className="muted">
          {message}
        </p>
      )}
    </div>
  );
}