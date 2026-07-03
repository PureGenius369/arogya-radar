import { NextResponse } from "next/server";
import { resetStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo hygiene: multiple judges share one in-memory store, so anyone can
// restore the pristine seeded dataset in one click.
export async function POST() {
  resetStore();
  return NextResponse.json({ ok: true });
}
