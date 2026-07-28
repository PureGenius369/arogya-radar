// Heat-wave early-warning — a second life-saving use of the same radar idea.
// Gujarat pioneered India's Heat Action Plans (Ahmedabad, 2013); heat kills
// here. This module gives the district a 7-day heat-index forecast, an IMD-style
// risk level, a readiness check (are ORS and IV fluids stocked for heat
// illness?), and the Heat Action Plan steps to take.
//
// The temperature feed is a demonstration feed pinned to the demo date (a
// realistic monsoon-break heat spell); in production it draws from the IMD
// district forecast. Peak heat season is March-June — the module escalates then.

import type { Store } from "./store";
import { stockRows } from "./stock";

export type HeatLevel = "normal" | "caution" | "warning" | "danger";

export interface HeatDay {
  date: string;
  label: string; // e.g. "Wed"
  tempMax: number; // deg C
  humidity: number; // %
  heatIndex: number; // feels-like deg C
  level: HeatLevel;
}

export interface HeatReadiness {
  drugName: string;
  unit: string;
  facilitiesShort: number;
  totalStocking: number;
}

export interface HeatForecastResult {
  days: HeatDay[];
  peak: HeatDay;
  level: HeatLevel;
  headline: string;
  readiness: HeatReadiness[];
  actions: string[];
  note: string;
}

// A simple feels-like: high humidity adds a few degrees over the actual max.
function heatIndex(tempC: number, humidity: number): number {
  return Math.round((tempC + Math.max(0, (humidity - 50) / 10) * 1.6) * 10) / 10;
}

function level(hi: number): HeatLevel {
  if (hi >= 45) return "danger";
  if (hi >= 40) return "warning";
  if (hi >= 37) return "caution";
  return "normal";
}

// Deterministic 7-day pattern from the demo date: a monsoon-break heat spell
// (temps climb as the rain pauses, then break). Pinned so the demo is stable.
const PATTERN: { t: number; h: number }[] = [
  { t: 30, h: 85 },
  { t: 34, h: 74 },
  { t: 38, h: 64 },
  { t: 40, h: 60 },
  { t: 41, h: 58 },
  { t: 36, h: 72 },
  { t: 31, h: 84 },
];
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEVEL_HEADLINE: Record<HeatLevel, string> = {
  danger: "Heat danger",
  warning: "Heat warning",
  caution: "Heat caution",
  normal: "No heat risk",
};

export function heatForecast(store: Store): HeatForecastResult {
  const start = store.records.endDate;
  const base = new Date(start + "T00:00:00Z");

  const days: HeatDay[] = PATTERN.map((p, i) => {
    const d = new Date(base.getTime() + i * 86400000);
    const date = d.toISOString().slice(0, 10);
    const hi = heatIndex(p.t, p.h);
    return {
      date,
      label: WEEKDAY[d.getUTCDay()],
      tempMax: p.t,
      humidity: p.h,
      heatIndex: hi,
      level: level(hi),
    };
  });

  const peak = days.reduce((a, b) => (b.heatIndex > a.heatIndex ? b : a));
  const warnDays = days.filter((d) => d.level === "warning" || d.level === "danger");

  // Readiness: heat illness needs rehydration — are ORS and IV fluids stocked?
  const rows = stockRows(store);
  const readiness: HeatReadiness[] = ["ors_sachet", "iv_ns_500"].map((id) => {
    const r = rows.filter((x) => x.drugId === id);
    const short = r.filter((x) => x.status === "stockout" || x.status === "critical" || x.status === "low");
    return {
      drugName: r[0]?.drugName ?? id,
      unit: r[0]?.unit ?? "",
      facilitiesShort: short.length,
      totalStocking: r.length,
    };
  });

  const headline =
    warnDays.length > 0
      ? `${LEVEL_HEADLINE[peak.level]} — feels-like up to ${peak.heatIndex}°C during a monsoon break (${warnDays[0].label}–${warnDays[warnDays.length - 1].label}).`
      : `${LEVEL_HEADLINE[peak.level]} this week — peak feels-like ${peak.heatIndex}°C.`;

  const actions =
    peak.level === "normal"
      ? ["Monitor the IMD district forecast; no heat action needed this week."]
      : [
          "Issue a district heat advisory — target outdoor workers, the elderly, and children.",
          "Confirm ORS and IV fluids are stocked at every CHC/PHC and that ORS/cooling corners are active.",
          "Alert facilities to watch for heat exhaustion and heatstroke; keep the coolest ward bed free.",
        ];

  return {
    days,
    peak,
    level: peak.level,
    headline,
    readiness,
    actions,
    note:
      "Temperature is a demonstration feed pinned to the demo date; in production it draws from the IMD district forecast. Peak heat season (March–June) escalates this module.",
  };
}
