"use client";

import { useState } from "react";

export default function ResetButton({ className = "btn sm secondary" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  async function reset() {
    setBusy(true);
    try {
      await fetch("/api/reset", { method: "POST" });
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }
  return (
    <button className={className} onClick={reset} disabled={busy} title="Restore the original demo dataset">
      {busy ? "Resetting…" : "↺ Reset demo data"}
    </button>
  );
}
