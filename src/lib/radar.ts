// Syndromic outbreak early-warning ("the radar").
//
// Method: EARS-C2-family aberration detection as used in real public-health
// surveillance (CDC EARS, WHO EWARS). For each facility and syndrome, the
// expected daily count is estimated from a 21-day rolling baseline with a
// 7-day guard band (days t-28..t-8), so an ongoing outbreak does not
// contaminate its own baseline. A day is "flagged" when the observed count
// exceeds mean + 2*sd with absolute floors that suppress noise at
// low-count facilities. Alerts are raised at BLOCK level when multiple
// facilities flag together - single-facility blips stay quiet.
//
// This is deliberately classical statistics, not an LLM: district health
// officers must be able to audit exactly why an alert fired.

import type { AlertSeverity, BlockAlert, FacilitySignal, Syndrome } from "./types";
import { SYNDROME_LABELS } from "./types";
import type { Store } from "./store";

export const RADAR_SYNDROMES: Syndrome[] = ["fever", "fever_rash", "diarrhoea", "ari", "jaundice"];

const RADAR_DISEASE_HINT: Record<string, string> = {
  fever: "malaria / dengue / viral fever watch",
  fever_rash: "dengue or measles-like illness",
  diarrhoea: "cholera / acute diarrhoeal disease",
  ari: "influenza-like illness",
  jaundice: "hepatitis-like illness",
};

function meanSd(values: number[]): { mu: number; sd: number } {
  if (values.length === 0) return { mu: 0, sd: 1 };
  const mu = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mu) ** 2, 0) / values.length;
  return { mu, sd: Math.max(1, Math.sqrt(variance)) };
}

/** Baseline stats for day t: 21-day window with a 7-day guard band. */
function baseline(series: number[], t: number): { mu: number; sd: number } {
  const from = Math.max(0, t - 28);
  const to = Math.max(1, t - 7);
  return meanSd(series.slice(from, to));
}

function isFlagged(series: number[], t: number): boolean {
  const { mu, sd } = baseline(series, t);
  const c = series[t];
  return c >= mu + 2 * sd && c >= mu + 3 && c >= 4;
}

export function detectAlerts(store: Store): BlockAlert[] {
  const { records, district } = store;
  const D = records.days.length;
  const today = D - 1;
  const alerts: BlockAlert[] = [];

  const blocks = Array.from(new Set(district.facilities.map((f) => f.block)));

  for (const block of blocks) {
    const blockFacs = district.facilities.filter((f) => f.block === block);

    for (const syndrome of RADAR_SYNDROMES) {
      const signals: FacilitySignal[] = [];

      for (const fac of blockFacs) {
        const series = records.facilities[fac.id]?.series[syndrome];
        if (!series) continue;

        const flaggedToday = isFlagged(series, today);
        const flaggedYesterday = isFlagged(series, today - 1);
        if (!flaggedToday && !flaggedYesterday) continue;

        let flaggedDays = 0;
        for (let k = 0; k < 3; k++) if (isFlagged(series, today - k)) flaggedDays++;

        const { mu, sd } = baseline(series, today);
        signals.push({
          facilityId: fac.id,
          facilityName: fac.name,
          today: series[today],
          baselineMean: Math.round(mu * 10) / 10,
          baselineSd: Math.round(sd * 10) / 10,
          zscore: Math.round(((series[today] - mu) / sd) * 10) / 10,
          flaggedDays,
          spark: series.slice(-21),
        });
      }

      if (signals.length === 0) continue;

      const persistent = signals.filter((s) => s.flaggedDays >= 2);

      // Block-level trend: summed counts across all facilities in the block.
      const trend: number[] = [];
      for (let k = 21; k >= 1; k--) {
        let sum = 0;
        for (const fac of blockFacs) {
          sum += records.facilities[fac.id]?.series[syndrome]?.[D - k] ?? 0;
        }
        trend.push(sum);
      }
      const recent = trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const prior = trend.slice(-9, -3).reduce((a, b) => a + b, 0) / 6;
      const rising = recent >= prior * 1.2;

      let severity: AlertSeverity | null = null;
      if (signals.length >= 2 && persistent.length >= 1 && rising) severity = "alert";
      else if (signals.length >= 2) severity = "warning";
      else if (persistent.length >= 1) severity = "watch";
      if (!severity) continue;

      // How long has this signal been visible? Earliest flagged day within
      // the last 10 days across the block's signalling facilities.
      let startedDaysAgo = 0;
      for (const s of signals) {
        const series = records.facilities[s.facilityId].series[syndrome];
        for (let back = 10; back >= 1; back--) {
          if (isFlagged(series, today - back)) {
            startedDaysAgo = Math.max(startedDaysAgo, back);
            break;
          }
        }
      }

      const totalToday = signals.reduce((a, s) => a + s.today, 0);
      const totalExpected = signals.reduce((a, s) => a + s.baselineMean, 0);
      const excessToday = Math.round(totalToday - totalExpected);

      alerts.push({
        id: `${block}-${syndrome}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        block,
        syndrome,
        label: `${SYNDROME_LABELS[syndrome]} — ${RADAR_DISEASE_HINT[syndrome]}`,
        severity,
        facilities: signals.sort((a, b) => b.zscore - a.zscore),
        excessToday,
        trend,
        startedDaysAgo,
        message:
          `${signals.length} of ${blockFacs.length} centres in ${block} block are reporting abnormal ` +
          `${SYNDROME_LABELS[syndrome].toLowerCase()} counts: ${totalToday} cases today vs ~${Math.round(totalExpected)} expected. ` +
          (startedDaysAgo > 0 ? `Signal first flagged ${startedDaysAgo} days ago.` : `Signal flagged today.`),
      });
    }
  }

  const order: Record<AlertSeverity, number> = { alert: 0, warning: 1, watch: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || b.excessToday - a.excessToday);
}

/** Highest alert level per facility, for map pins. */
export function facilityAlertLevels(alerts: BlockAlert[]): Record<string, AlertSeverity> {
  const rank: Record<AlertSeverity, number> = { watch: 0, warning: 1, alert: 2 };
  const out: Record<string, AlertSeverity> = {};
  for (const a of alerts) {
    for (const s of a.facilities) {
      if (!out[s.facilityId] || rank[a.severity] > rank[out[s.facilityId]]) {
        out[s.facilityId] = a.severity;
      }
    }
  }
  return out;
}
