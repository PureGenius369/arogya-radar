// Assembles the full district dashboard payload from the store.

import type { AlertSeverity, BlockAlert, ComplianceRow, ExpiryRow, Reporter, StockRow, TransferRec } from "./types";
import type { Store } from "./store";
import { detectAlerts, facilityAlertLevels } from "./radar";
import { expiryRows, stockRows, transferRecs } from "./stock";
import { complianceRows, complianceSummary } from "./compliance";

export interface FacilityStatus {
  id: string;
  name: string;
  type: string;
  block: string;
  lat: number;
  lng: number;
  beds: number;
  bedOccupied: number;
  reportedToday: boolean;
  daysSinceReport: number;
  lastReporter?: Reporter | null;
  alertLevel: AlertSeverity | null;
  worstStock: string; // status of the worst drug line
  criticalDrugs: number;
  footfallToday: number;
}

export interface Dashboard {
  district: string;
  state: string;
  endDate: string;
  center: { lat: number; lng: number };
  kpis: {
    activeAlerts: number;
    reportingRate: number; // percent
    criticalLines: number; // facility-drug pairs at stockout/critical
    expiryWasteValue: number; // rupees at risk in next 120 days
    bedsUnderPressure: number; // facilities at >=90% occupancy
    silentCount: number; // facilities overdue on reporting
    blindSpotCount: number; // overdue facilities inside an alert block
  };
  alerts: BlockAlert[];
  facilities: FacilityStatus[];
  shortages: StockRow[];
  expiry: ExpiryRow[];
  expiryTotal: number;
  transfers: TransferRec[];
  compliance: ComplianceRow[];
  intakeLog: { at: string; facilityId: string; summary: string; reporter?: Reporter | null }[];
}

const STOCK_RANK = { stockout: 0, critical: 1, low: 2, ok: 3, surplus: 4 } as const;

export function buildDashboard(store: Store): Dashboard {
  const { district, records } = store;
  const t = records.days.length - 1;

  const alerts = detectAlerts(store);
  const levels = facilityAlertLevels(alerts);
  const rows = stockRows(store);
  const expiry = expiryRows(store, 120);
  const transfers = transferRecs(store, alerts);
  const compliance = complianceRows(store, alerts);
  const compSummary = complianceSummary(compliance);

  const facilities: FacilityStatus[] = district.facilities.map((f) => {
    const fd = records.facilities[f.id];
    const facRows = rows.filter((r) => r.facilityId === f.id);
    const worst = facRows.reduce(
      (acc, r) => (STOCK_RANK[r.status] < STOCK_RANK[acc] ? r.status : acc),
      "surplus" as StockRow["status"]
    );
    return {
      id: f.id,
      name: f.name,
      type: f.type,
      block: f.block,
      lat: f.lat,
      lng: f.lng,
      beds: f.beds,
      bedOccupied: fd?.series.bedOccupied[t] ?? 0,
      reportedToday: (fd?.lastReportDaysAgo ?? 0) === 0,
      daysSinceReport: fd?.lastReportDaysAgo ?? 0,
      lastReporter: fd?.lastReporter ?? null,
      alertLevel: levels[f.id] ?? null,
      worstStock: worst,
      criticalDrugs: facRows.filter((r) => r.status === "stockout" || r.status === "critical").length,
      footfallToday: fd?.series.footfall[t] ?? 0,
    };
  });

  const shortages = rows
    .filter((r) => r.status === "stockout" || r.status === "critical" || r.status === "low")
    .sort((a, b) => a.daysOfStock - b.daysOfStock);
  const expiryTotal = expiry.reduce((a, e) => a + e.wasteValue, 0);

  return {
    district: district.district,
    state: district.state,
    endDate: records.endDate,
    center: district.center,
    kpis: {
      activeAlerts: alerts.filter((a) => a.severity !== "watch").length,
      reportingRate: compSummary.reportingRate,
      criticalLines: rows.filter((r) => r.status === "stockout" || r.status === "critical").length,
      expiryWasteValue: expiryTotal,
      bedsUnderPressure: facilities.filter((f) => f.beds > 0 && f.bedOccupied / f.beds >= 0.9).length,
      silentCount: compSummary.silentCount,
      blindSpotCount: compSummary.blindSpotCount,
    },
    alerts,
    facilities,
    shortages: shortages.slice(0, 15),
    expiry: expiry.slice(0, 10),
    expiryTotal,
    transfers,
    compliance,
    intakeLog: store.intakeLog.slice(0, 5),
  };
}
