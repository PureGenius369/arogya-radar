"use client";

import { useRef, useState } from "react";

export interface ReporterValue {
  name: string;
  staffId: string;
  role: string;
  photo: string | null; // data URL captured on the spot
}

const ROLES = ["Pharmacist", "ANM", "Staff Nurse", "MPHW (M)", "MPHW (F)", "Medical Officer", "Lab Technician"];

export default function ReporterBlock({
  value,
  onChange,
}: {
  value: ReporterValue;
  onChange: (v: ReporterValue) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  async function openCamera() {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCamOn(true);
      // The <video> mounts when camOn flips true; attach on next tick.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCamError("Camera access was denied. You can still submit without a photo.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const w = v.videoWidth || 320;
    const h = v.videoHeight || 240;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = Math.round((320 * h) / w);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    onChange({ ...value, photo: canvas.toDataURL("image/jpeg", 0.7) });
    stopCamera();
  }

  return (
    <div className="reporter-block">
      <label className="fld" style={{ marginTop: 0 }}>
        Who is recording this report? <span style={{ color: "var(--danger)" }}>*</span>
      </label>
      <div className="reporter-grid">
        <input
          type="text"
          placeholder="Full name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Staff ID (e.g. KLH-PHC-0142)"
          value={value.staffId}
          onChange={(e) => onChange({ ...value, staffId: e.target.value })}
        />
        <select value={value.role} onChange={(e) => onChange({ ...value, role: e.target.value })}>
          <option value="">— role —</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="reporter-photo">
        {value.photo ? (
          <div className="reporter-photo-taken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.photo} alt="Reporter" />
            <div>
              <div className="notice ok" style={{ marginBottom: 8 }}>
                Photo captured on the spot ✓
              </div>
              <button
                className="btn sm secondary"
                onClick={() => onChange({ ...value, photo: null })}
              >
                Retake
              </button>
            </div>
          </div>
        ) : camOn ? (
          <div>
            <video ref={videoRef} className="reporter-video" playsInline muted />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn sm" onClick={capture}>
                📸 Capture
              </button>
              <button className="btn sm secondary" onClick={stopCamera}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn sm secondary" onClick={openCamera}>
            📷 Take reporter photo on the spot
          </button>
        )}
        {camError && <div className="notice warn" style={{ marginTop: 8 }}>{camError}</div>}
      </div>
    </div>
  );
}
