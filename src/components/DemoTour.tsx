"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ResetButton from "./ResetButton";

export default function DemoTour() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(localStorage.getItem("ar-tour") !== "off");
  }, []);
  if (!visible) return null;

  return (
    <div className="tour">
      <button
        className="tour-close"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem("ar-tour", "off");
          setVisible(false);
        }}
      >
        ✕
      </button>
      <strong>First time here?</strong> You are looking at a live demo on a simulated Kalahandi
      district (real facility network, synthetic daily data — see README). A dengue-like outbreak
      is flaring in <strong>Lanjigarh block</strong>: the radar caught it days before any weekly
      report would. Medicines worth lakhs are about to expire in the west — and the transfer list
      already routes them to the outbreak in the east.
      <div className="tour-actions">
        <Link className="btn sm" href="/intake">
          Try the AI intake — voice or register photo
        </Link>
        <ResetButton />
      </div>
    </div>
  );
}
