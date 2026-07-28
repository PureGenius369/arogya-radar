import { NextResponse } from "next/server";
import { setAction } from "@/lib/store";
import { ACTION_FLOW, type ActionStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Records an officer's action on an alert — the closed response loop. Session
// state (in-memory); a real deployment would persist this to Firestore with
// the acting officer's authenticated identity.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { id?: string; status?: string; by?: string; note?: string };
    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json({ ok: false, error: "Missing alert id." }, { status: 400 });
    }
    if (!body.status || !ACTION_FLOW.includes(body.status as ActionStatus)) {
      return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
    }
    const rec = setAction(body.id, body.status as ActionStatus, body.by, body.note);
    return NextResponse.json({ ok: true, record: rec });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
}
