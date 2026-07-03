import { NextRequest, NextResponse } from "next/server";
import { getFacility, getStore } from "@/lib/store";
import { parseIntake } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const facilityId = String(form.get("facilityId") ?? "");
    const mode = String(form.get("mode") ?? "");
    const file = form.get("file");

    const facility = getFacility(facilityId);
    if (!facility) {
      return NextResponse.json({ ok: false, error: "Unknown facility." }, { status: 400 });
    }
    if (mode !== "audio" && mode !== "image") {
      return NextResponse.json({ ok: false, error: "mode must be audio or image." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file attached." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File is empty or over 20 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const store = getStore();
    const result = await parseIntake({
      mode,
      base64: buffer.toString("base64"),
      mimeType: file.type || (mode === "audio" ? "audio/webm" : "image/jpeg"),
      facility,
      drugs: store.drugs,
      today: store.records.endDate,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Intake parsing failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
