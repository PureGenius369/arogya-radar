import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildDashboard } from "@/lib/analytics";
import { generateBrief } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { language = "en" } = (await req.json().catch(() => ({}))) as { language?: string };
    const dash = buildDashboard(getStore());

    // Compact payload: only what the brief needs, so the prompt stays small.
    const payload = {
      district: dash.district,
      endDate: dash.endDate,
      reportingRate: dash.kpis.reportingRate,
      alerts: dash.alerts.map((a) => ({
        severity: a.severity,
        block: a.block,
        label: a.label,
        message: a.message,
        startedDaysAgo: a.startedDaysAgo,
        facilities: a.facilities.map((f) => ({
          name: f.facilityName,
          today: f.today,
          expected: f.baselineMean,
        })),
      })),
      shortages: dash.shortages.slice(0, 10).map((s) => ({
        facilityName: s.facilityName,
        drugName: s.drugName,
        daysOfStock: s.daysOfStock,
        status: s.status,
      })),
      reportingBlindSpots: dash.compliance
        .filter((c) => c.severity !== "ok")
        .slice(0, 6)
        .map((c) => ({
          facilityName: c.facilityName,
          block: c.block,
          daysSilent: c.daysSinceReport,
          blindSpotInOutbreakBlock: c.severity === "blindspot",
          lastReportedBy: c.lastReporter ? `${c.lastReporter.name}, ${c.lastReporter.role}` : null,
        })),
      expiryTotal: dash.expiryTotal,
      expiryTop: dash.expiry.slice(0, 6).map((e) => ({
        facilityName: e.facilityName,
        drugName: e.drugName,
        wasteUnits: e.expectedWasteUnits,
        unit: e.unit,
        expiry: e.expiry,
        wasteValue: e.wasteValue,
      })),
      transfers: dash.transfers.slice(0, 10).map((t) => ({
        drugName: t.drugName,
        qty: t.qty,
        unit: t.unit,
        fromName: t.fromName,
        toName: t.toName,
        km: t.km,
        reason: t.reason,
        valueSaved: t.valueSaved,
      })),
    };

    const { text, mock } = await generateBrief(payload, language);
    return NextResponse.json({ ok: true, brief: text, mock });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brief generation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
