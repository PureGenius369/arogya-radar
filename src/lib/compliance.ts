// Reporting-compliance ("who reported, who went silent").
//
// A surveillance system is only as good as its reporting coverage. A centre
// that stops reporting is not "no news" - it is a blind spot, and a blind
// spot inside a block that is already flagging an outbreak is the most
// dangerous state of all. This layer makes silence visible and attributes
// every report to a named person the district can follow up with.

import type { BlockAlert, ComplianceRow, ComplianceSeverity } from "./types";
import type { Store } from "./store";

const OVERDUE_DAYS = 2;

export function complianceRows(store: Store, alerts: BlockAlert[]): ComplianceRow[] {
  const { district, records } = store;
  const alertBlocks = new Set(alerts.map((a) => a.block));

  const rows: ComplianceRow[] = district.facilities.map((f) => {
    const fd = records.facilities[f.id];
    const days = fd?.lastReportDaysAgo ?? 0;
    const inAlertBlock = alertBlocks.has(f.block);
    let severity: ComplianceSeverity = "ok";
    if (days >= OVERDUE_DAYS) severity = inAlertBlock ? "blindspot" : "overdue";
    return {
      facilityId: f.id,
      facilityName: f.name,
      block: f.block,
      type: f.type,
      daysSinceReport: days,
      severity,
      inAlertBlock,
      lastReporter: fd?.lastReporter ?? null,
    };
  });

  const rank: Record<ComplianceSeverity, number> = { blindspot: 0, overdue: 1, ok: 2 };
  return rows.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || b.daysSinceReport - a.daysSinceReport
  );
}

export function complianceSummary(rows: ComplianceRow[]) {
  const reported = rows.filter((r) => r.daysSinceReport === 0).length;
  return {
    reportingRate: Math.round((reported / rows.length) * 100),
    silentCount: rows.filter((r) => r.severity !== "ok").length,
    blindSpotCount: rows.filter((r) => r.severity === "blindspot").length,
  };
}
