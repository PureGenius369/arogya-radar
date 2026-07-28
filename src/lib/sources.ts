// The data-supply story. Arogya Radar is an intelligence layer on top of the
// data Gujarat ALREADY collects — not a new data-entry burden. Each analytic
// names the existing state system it draws from in production. In the pilot
// these feeds are simulated (calibrated to the real systems); the `status`
// field says so honestly so nobody is misled in a demo.

export type FeedStatus = "live" | "pilot-sim" | "planned";

export interface DataFeed {
  id: string;
  name: string;
  operator: string; // whose system it is
  provides: string; // what it supplies
  feedsInto: string; // which analytic pillar it powers
  entryFree: boolean; // true = requires NO new manual data entry
  status: FeedStatus;
  note: string;
}

export const DATA_FEEDS: DataFeed[] = [
  {
    id: "eaushadhi",
    name: "e-Aushadhi / DVDMS",
    operator: "GMSCL — Gujarat Medical Services Corporation",
    provides: "Drug stock, consumption & expiry — to PHC level, in real time",
    feedsInto: "Stock emergencies · Expiry ₹ · Redistribution · Consumption radar",
    entryFree: true,
    status: "pilot-sim",
    note: "Already digital statewide. The medicine half of the radar needs zero facility data entry.",
  },
  {
    id: "techo",
    name: "TeCHO+",
    operator: "Gujarat Dept. of Health & Family Welfare",
    provides: "Frontline ASHA/ANM field data — all 33 districts, ~60M people",
    feedsInto: "Outbreak radar · maternal & child signals",
    entryFree: true,
    status: "pilot-sim",
    note: "Gujarat's own platform — frontline workers already enter here. We consume it, not rebuild it.",
  },
  {
    id: "ihip",
    name: "IHIP / IDSP",
    operator: "MoHFW & the State IDSP unit",
    provides: "Weekly syndromic surveillance + historical outbreak archives",
    feedsInto: "Outbreak-radar baseline · retrospective back-testing",
    entryFree: true,
    status: "pilot-sim",
    note: "Coarse and late on its own — used as the baseline, never the live signal.",
  },
  {
    id: "imd",
    name: "IMD district forecast",
    operator: "India Meteorological Department",
    provides: "Daily temperature, humidity and heat-index forecast",
    feedsInto: "Heat-wave early warning",
    entryFree: true,
    status: "pilot-sim",
    note: "Powers heat-illness alerts and readiness — a second life-saving use, no data entry.",
  },
  {
    id: "field",
    name: "Field reports — voice / photo / WhatsApp",
    operator: "Facility staff, last mile only",
    provides: "Same-day counts from sub-centres with nothing digital yet",
    feedsInto: "Outbreak radar (last-mile enrichment)",
    entryFree: false,
    status: "live",
    note: "Not data entry — a photo of the register they already fill by law, or a 30-second voice note. Enrichment, not the foundation.",
  },
];
