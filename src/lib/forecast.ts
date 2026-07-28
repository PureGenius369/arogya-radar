// Short-term outbreak forecast — turns "this is flaring" into "here is where it
// is heading, act now." Deliberately simple, damped, and auditable (same ethos
// as radar.ts): it projects the block's recent growth forward 7 and 14 days,
// damps the second week (outbreaks plateau, they do not grow forever), and
// converts the projected caseload into the medicines to pre-position. It is a
// planning aid that assumes the current trend continues — not a certainty.

import type { BlockAlert, Drug, Syndrome } from "./types";
import type { Store } from "./store";

export interface DrugAsk {
  drugId: string;
  drugName: string;
  unit: string;
  qty: number;
}

export interface Forecast {
  alertId: string;
  block: string;
  syndrome: Syndrome;
  label: string;
  todayPerDay: number; // block cases today
  projected7: number; // projected cases/day in 7 days
  projected14: number; // projected cases/day in 14 days
  cumulative14: number; // total cases expected over the next 14 days
  weeklyGrowthPct: number; // estimated weekly growth used
  drugAsk: DrugAsk[]; // medicines to pre-position for 14 days of cover
}

function mean(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

function drugAskFor(drugs: Drug[], syndrome: Syndrome, avgDailyCases: number): DrugAsk[] {
  return drugs
    .filter((d) => d.outbreak.includes(syndrome) && (d.perCase[syndrome] ?? 0) > 0)
    .map((d) => ({
      drugId: d.id,
      drugName: d.name,
      unit: d.unit,
      // 14 days of cover at the projected average caseload, +20% buffer.
      qty: Math.round(avgDailyCases * (d.perCase[syndrome] ?? 0) * 14 * 1.2),
    }))
    .filter((a) => a.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);
}

export function forecastOutbreaks(store: Store, alerts: BlockAlert[]): Forecast[] {
  const out: Forecast[] = [];

  for (const a of alerts) {
    if (a.severity === "watch") continue; // only forecast real signals
    const trend = a.trend; // block-level daily totals, last 21 days
    if (!trend || trend.length < 14) continue;

    const today = trend[trend.length - 1];
    const recent = mean(trend.slice(-3));
    const prior = mean(trend.slice(-10, -7));
    if (recent <= 0) continue;

    // Weekly growth from the trend, clamped so a near-zero baseline or a noisy
    // spike cannot produce an alarmist projection.
    let weekly = recent / Math.max(1, prior);
    weekly = Math.max(1.05, Math.min(2.5, weekly));
    if (weekly < 1.15) continue; // not meaningfully growing — nothing to forecast

    const week2 = 1 + (weekly - 1) * 0.5; // damp the second week
    const projected7 = today * weekly;
    const projected14 = projected7 * week2;

    // Total cases over the next 14 days (trapezoidal across the two weeks).
    const cumulative14 = ((today + projected7) / 2) * 7 + ((projected7 + projected14) / 2) * 7;
    const avgDaily = cumulative14 / 14;

    out.push({
      alertId: a.id,
      block: a.block,
      syndrome: a.syndrome,
      label: a.label,
      todayPerDay: Math.round(today),
      projected7: Math.round(projected7),
      projected14: Math.round(projected14),
      cumulative14: Math.round(cumulative14),
      weeklyGrowthPct: Math.round((weekly - 1) * 100),
      drugAsk: drugAskFor(store.drugs, a.syndrome, avgDaily),
    });
  }

  return out.sort((a, b) => b.cumulative14 - a.cumulative14);
}
