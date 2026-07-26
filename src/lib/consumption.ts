// Drug-consumption outbreak signal — the answer to "staff won't enter data."
//
// This radar needs NO symptom reporting. It runs the same EARS-C2-family
// aberration detection as radar.ts, but over how much of each outbreak-relevant
// medicine a facility is CONSUMING — data the drug supply chain (e-Aushadhi)
// already records. When ORS / IV-fluid draw-down spikes, that is a diarrhoeal
// outbreak; when antipyretic, malaria and dengue-kit consumption climb together,
// that is a febrile / dengue outbreak — inferred from medicine movement, not
// from anyone counting patients. It independently corroborates the syndromic
// radar, and it is the part of the system that works even if not one facility
// files a symptom report.

import type { AlertSeverity } from "./types";
import type { Store } from "./store";

// Two clinically coherent drug groups map to the two outbreak types that show
// up in a district like Dahod. Each is defined by the medicines whose draw-down
// rises during that kind of outbreak.
const CONSUMPTION_GROUPS: { key: string; label: string; hint: string; drugs: string[] }[] = [
  {
    key: "febrile",
    label: "Febrile-illness medicines",
    hint: "fever / malaria / dengue",
    drugs: ["paracetamol_500", "act_kit", "rdt_malaria", "ns1_dengue"],
  },
  {
    key: "diarrhoeal",
    label: "Diarrhoeal-disease medicines",
    hint: "cholera / acute diarrhoeal disease",
    drugs: ["ors_sachet", "zinc_20", "iv_ns_500", "ondansetron_4"],
  },
];

export interface ConsumptionSignal {
  facilityId: string;
  facilityName: string;
  todayUnits: number;
  baselineUnits: number;
  ratio: number; // today / baseline
  zscore: number;
  flaggedDays: number;
  drivers: string[]; // drug names driving the spike
  spark: number[];
}

export interface ConsumptionAlert {
  id: string;
  block: string;
  group: string;
  label: string;
  severity: AlertSeverity;
  facilities: ConsumptionSignal[];
  message: string;
  startedDaysAgo: number;
}

function meanSd(values: number[]): { mu: number; sd: number } {
  if (values.length === 0) return { mu: 0, sd: 1 };
  const mu = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mu) ** 2, 0) / values.length;
  return { mu, sd: Math.max(1, Math.sqrt(variance)) };
}

/** Baseline for day t: 21-day window with a 7-day guard band (as in radar.ts). */
function baseline(series: number[], t: number): { mu: number; sd: number } {
  const from = Math.max(0, t - 28);
  const to = Math.max(1, t - 7);
  return meanSd(series.slice(from, to));
}

/** Consumption is continuous, so we flag on a z-score AND a ≥50% relative jump. */
function isFlagged(series: number[], t: number): boolean {
  if (t < 0 || t >= series.length) return false;
  const { mu, sd } = baseline(series, t);
  const c = series[t];
  return c >= mu + 2 * sd && c >= mu * 1.5 && mu >= 3;
}

/** Per-facility daily consumption of a set of drugs (element-wise sum). */
function groupSeries(store: Store, facilityId: string, drugIds: string[]): number[] | null {
  const fac = store.records.facilities[facilityId];
  if (!fac) return null;
  let series: number[] | null = null;
  for (const id of drugIds) {
    const c = fac.stock[id]?.consumption30;
    if (!c || c.length === 0) continue;
    if (!series) series = new Array(c.length).fill(0);
    for (let i = 0; i < c.length && i < series.length; i++) series[i] += c[i];
  }
  return series;
}

/** Drugs with the biggest relative jump today, for the "what's moving" line. */
function topDrivers(store: Store, facilityId: string, drugIds: string[]): string[] {
  const fac = store.records.facilities[facilityId];
  if (!fac) return [];
  const drugName = (id: string) => store.drugs.find((d) => d.id === id)?.name ?? id;
  return drugIds
    .map((id) => {
      const c = fac.stock[id]?.consumption30;
      if (!c || c.length === 0) return null;
      const t = c.length - 1;
      const { mu } = baseline(c, t);
      return { name: drugName(id), jump: c[t] / Math.max(1, mu), today: c[t] };
    })
    .filter((x): x is { name: string; jump: number; today: number } => x != null && x.today > 0)
    .sort((a, b) => b.jump - a.jump)
    .slice(0, 2)
    .map((x) => x.name);
}

export function detectConsumptionAlerts(store: Store): ConsumptionAlert[] {
  const { district } = store;
  const alerts: ConsumptionAlert[] = [];
  const blocks = Array.from(new Set(district.facilities.map((f) => f.block)));

  for (const block of blocks) {
    const blockFacs = district.facilities.filter((f) => f.block === block);

    for (const group of CONSUMPTION_GROUPS) {
      const signals: ConsumptionSignal[] = [];

      for (const fac of blockFacs) {
        const drugIds = group.drugs.filter((id) => {
          const d = store.drugs.find((x) => x.id === id);
          return d && d.tiers.includes(fac.type);
        });
        const series = groupSeries(store, fac.id, drugIds);
        if (!series) continue;
        const t = series.length - 1;

        // Only surface facilities that are elevated TODAY (avoids showing
        // below-baseline facilities inside an alert).
        if (!isFlagged(series, t)) continue;

        let flaggedDays = 0;
        for (let k = 0; k < 3; k++) if (isFlagged(series, t - k)) flaggedDays++;

        const { mu, sd } = baseline(series, t);
        signals.push({
          facilityId: fac.id,
          facilityName: fac.name,
          todayUnits: Math.round(series[t]),
          baselineUnits: Math.round(mu),
          ratio: Math.round((series[t] / Math.max(1, mu)) * 10) / 10,
          zscore: Math.round(((series[t] - mu) / sd) * 10) / 10,
          flaggedDays,
          drivers: topDrivers(store, fac.id, drugIds),
          spark: series.slice(-21),
        });
      }

      if (signals.length === 0) continue;
      const persistent = signals.filter((s) => s.flaggedDays >= 2);

      // Strong corroboration required for an alert — this is a decision aid a
      // district officer will act on, so single noisy facilities stay quiet.
      let severity: AlertSeverity | null = null;
      if (signals.length >= 3 && persistent.length >= 2) severity = "alert";
      else if (signals.length >= 2) severity = "warning";
      else if (persistent.length >= 1) severity = "watch";
      if (!severity) continue;

      let startedDaysAgo = 0;
      for (const s of signals) {
        const fac = blockFacs.find((f) => f.id === s.facilityId)!;
        const drugIds = group.drugs.filter((id) => {
          const d = store.drugs.find((x) => x.id === id);
          return d && d.tiers.includes(fac.type);
        });
        const series = groupSeries(store, s.facilityId, drugIds);
        if (!series) continue;
        const t = series.length - 1;
        for (let back = 9; back >= 1; back--) {
          if (isFlagged(series, t - back)) {
            startedDaysAgo = Math.max(startedDaysAgo, back);
            break;
          }
        }
      }

      const uniqueDrivers = Array.from(new Set(signals.flatMap((s) => s.drivers))).slice(0, 3);
      const peak = signals.reduce((a, b) => (b.ratio > a.ratio ? b : a));

      alerts.push({
        id: `cons-${block}-${group.key}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        block,
        group: group.key,
        label: `${group.label} — ${group.hint}`,
        severity,
        facilities: signals.sort((a, b) => b.ratio - a.ratio),
        startedDaysAgo,
        message:
          `Medicine consumption alone flags a possible ${group.hint.split(" / ")[0]} cluster in ` +
          `${block} block — no symptom reporting needed. ${signals.length} of ${blockFacs.length} centres ` +
          `show ${uniqueDrivers.join(" + ") || "relevant drug"} draw-down up to ${peak.ratio}× baseline` +
          (startedDaysAgo > 0 ? `, first seen ${startedDaysAgo} days ago.` : ` today.`),
      });
    }
  }

  const order: Record<AlertSeverity, number> = { alert: 0, warning: 1, watch: 2 };
  return alerts.sort(
    (a, b) => order[a.severity] - order[b.severity] || b.facilities.length - a.facilities.length
  );
}
