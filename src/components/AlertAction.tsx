"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACTION_FLOW, ACTION_LABEL, type ActionStatus } from "@/lib/types";

export default function AlertAction({
  id,
  status,
  updatedAt,
}: {
  id: string;
  status: ActionStatus;
  updatedAt?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<ActionStatus | null>(null);
  const current = optimistic ?? status;
  const curIdx = ACTION_FLOW.indexOf(current);

  // Once the server re-render lands with the new status, drop the optimistic
  // override so we show the source of truth.
  useEffect(() => {
    setOptimistic(null);
  }, [status, updatedAt]);

  async function set(next: ActionStatus) {
    if (pending || next === current) return;
    setOptimistic(next);
    try {
      await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      startTransition(() => router.refresh());
    } catch {
      setOptimistic(null);
    }
  }

  return (
    <div className="action-row">
      <span className="action-label">Response</span>
      <div className="action-steps" role="group" aria-label="Response status">
        {ACTION_FLOW.map((s, i) => (
          <button
            key={s}
            className={`action-pill ${s}${current === s ? " active" : ""}${i < curIdx ? " done" : ""}`}
            disabled={pending}
            onClick={() => set(s)}
          >
            {ACTION_LABEL[s]}
          </button>
        ))}
      </div>
      {current !== "open" && updatedAt && !optimistic && (
        <span className="action-time">
          {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
