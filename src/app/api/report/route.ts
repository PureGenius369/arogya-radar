import { NextRequest, NextResponse } from "next/server";
import { applyReport, getFacility } from "@/lib/store";
import type { IntakeReport } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IntakeReport;
    if (!body?.facilityId || !getFacility(body.facilityId)) {
      return NextResponse.json({ ok: false, error: "Unknown facility." }, { status: 400 });
    }
    const { applied } = applyReport(body);
    if (applied.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nothing to save — the report contained no usable values." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the report.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
