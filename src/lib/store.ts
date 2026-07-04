import fs from "node:fs";
import path from "node:path";
import type { DistrictFile, Drug, Facility, IntakeReport, Reporter, RecordsFile, Syndrome } from "./types";
import { SYNDROMES } from "./types";

export interface Store {
  district: DistrictFile;
  drugs: Drug[];
  records: RecordsFile;
  intakeLog: { at: string; facilityId: string; summary: string; reporter?: Reporter | null }[];
}

// Survives Next.js dev-server HMR reloads and is shared across route handlers.
const g = globalThis as unknown as { __arogyaStore?: Store };

function load(): Store {
  const dataDir = path.join(process.cwd(), "data");
  const district = JSON.parse(fs.readFileSync(path.join(dataDir, "district.json"), "utf8")) as DistrictFile;
  const drugs = (JSON.parse(fs.readFileSync(path.join(dataDir, "drugs.json"), "utf8")) as { drugs: Drug[] }).drugs;
  const records = JSON.parse(fs.readFileSync(path.join(dataDir, "records.json"), "utf8")) as RecordsFile;
  return { district, drugs, records, intakeLog: [] };
}

export function getStore(): Store {
  if (!g.__arogyaStore) g.__arogyaStore = load();
  return g.__arogyaStore;
}

/** Reloads the pristine generated dataset, discarding all session intake. */
export function resetStore(): void {
  g.__arogyaStore = load();
}

export function getFacility(id: string): Facility | undefined {
  return getStore().district.facilities.find((f) => f.id === id);
}

export function todayIndex(): number {
  return getStore().records.days.length - 1;
}

/**
 * Applies a confirmed intake report to the in-memory store: overwrites
 * today's series values for the facility and replaces on-hand stock for the
 * reported drugs. Marks the facility as having reported today.
 */
export function applyReport(report: IntakeReport): { applied: string[] } {
  const store = getStore();
  const fac = store.records.facilities[report.facilityId];
  if (!fac) throw new Error("Unknown facility: " + report.facilityId);
  const t = todayIndex();
  const applied: string[] = [];

  if (report.footfall != null && report.footfall >= 0) {
    fac.series.footfall[t] = Math.round(report.footfall);
    applied.push("footfall");
  }
  for (const s of SYNDROMES) {
    const v = report.syndromes?.[s as Syndrome];
    if (v != null && v >= 0) {
      fac.series[s][t] = Math.round(v);
      applied.push(s);
    }
  }
  if (report.bedOccupied != null && report.bedOccupied >= 0) {
    fac.series.bedOccupied[t] = Math.round(report.bedOccupied);
    applied.push("beds");
  }
  // Keep "other" consistent: footfall minus the specific syndromes.
  const specific = SYNDROMES.reduce((a, s) => a + (fac.series[s][t] ?? 0), 0);
  fac.series.other[t] = Math.max(0, (fac.series.footfall[t] ?? 0) - specific);

  for (const line of report.stock ?? []) {
    if (!line.drugId || line.onHand == null || line.onHand < 0) continue;
    const existing = fac.stock[line.drugId];
    const prevExpiry = existing?.batches?.[0]?.expiry;
    const fallbackExpiry = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
    const expiry = line.expiry || prevExpiry || fallbackExpiry;
    fac.stock[line.drugId] = {
      batches: [{ id: "INTAKE-" + Date.now().toString(36), qty: Math.round(line.onHand), expiry }],
      consumption30: existing?.consumption30 ?? [],
    };
    applied.push(line.drugId);
  }

  fac.lastReportDaysAgo = 0;
  if (report.reporter && report.reporter.name) fac.lastReporter = report.reporter;
  store.intakeLog.unshift({
    at: new Date().toISOString(),
    facilityId: report.facilityId,
    summary: applied.join(", "),
    reporter: report.reporter ?? null,
  });
  return { applied };
}
