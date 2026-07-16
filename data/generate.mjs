// Synthetic district data generator for Arogya Radar.
// Produces data/records.json: 90 days of daily facility activity (footfall,
// syndrome counts, bed occupancy) plus batch-level drug stock simulated with
// FEFO consumption, monthly indents, a seeded dengue-like outbreak in
// Lanjigarh block and near-expiry surplus batches in the west of the district.
// Deterministic (seeded RNG) so regeneration is stable.
//
// Calibration targets: HMIS item-wise monthly reports for Kalahandi
// (data.gov.in), IDSP weekly outbreak reports for Odisha. Daily
// facility-level data does not exist publicly - that gap is what the
// product's intake pipeline creates.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DAYS = 90;
const SEED = 20260703;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);

function normal(mean, sd) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * sd;
}

// Count sampler: normal approximation of Poisson, floored at 0.
function counts(lambda) {
  if (lambda <= 0) return 0;
  return Math.max(0, Math.round(normal(lambda, Math.sqrt(Math.max(lambda, 1)))));
}

function uniform(a, b) {
  return a + rnd() * (b - a);
}

const district = JSON.parse(fs.readFileSync(path.join(__dirname, "district.json"), "utf8"));
const drugCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "drugs.json"), "utf8")).drugs;

// Pinned "today" so the demo is deterministic and stable across every
// regenerate/redeploy (the Dockerfile regenerates at build time). Without
// this, new Date() shifts the 90-day window each day and the numbers drift.
const end = new Date("2026-07-08T12:00:00Z");
const days = [];
for (let i = DAYS - 1; i >= 0; i--) {
  days.push(new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10));
}
const endDate = days[DAYS - 1];

const SYNDROMES = ["fever", "fever_rash", "diarrhoea", "ari", "jaundice", "snakebite", "maternal", "injury"];
const SHARE = {
  fever: 0.17,
  fever_rash: 0.008,
  diarrhoea: 0.09,
  ari: 0.14,
  jaundice: 0.005,
  snakebite: 0.004,
  maternal: 0.08,
  injury: 0.05,
};
const TYPE_MULT = { PHC: 1, CHC: 1.7, SDH: 2.4, DHH: 3.2 };
const BED_BASE_OCC = { PHC: 0.25, CHC: 0.55, SDH: 0.7, DHH: 0.85 };

// Doctor attendance: sanctioned posts by facility type, plus seeded chronic
// shortfalls (posts that sit vacant — the "unpredictable doctor attendance"
// the problem statement calls out).
const DOCTORS_SANCTIONED = { PHC: 2, CHC: 4, SDH: 8, DHH: 15 };
const DOCTOR_SHORTFALL = { PHC10: 1, PHC13: 1, PHC22: 2, CHC07: 2, PHC16: 1 };

// Facilities whose beds run hot (≥90% occupancy) so bed pressure is visible.
const BED_PRESSURE = { DHH01: 0.94, CHC05: 0.93, CHC01: 0.91 };

// Monsoon uplift by month for climate-sensitive syndromes (Apr..Jul window).
function monsoonBoost(dateStr, syndrome) {
  const m = Number(dateStr.slice(5, 7));
  const wet = ["fever", "diarrhoea", "snakebite", "jaundice"];
  if (!wet.includes(syndrome)) return 1;
  if (m <= 4) return 1.0;
  if (m === 5) return 1.05;
  if (m === 6) return 1.2;
  return 1.35;
}

function weekdayFactor(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z").getUTCDay();
  if (d === 0) return 0.5;
  if (d === 6) return 0.85;
  return 1;
}

// ---- Seeded events -------------------------------------------------------

// Dengue-like outbreak: Lanjigarh block + adjacent Thuamul Rampur PHC.
// Signal starts 9 days before "today" and ramps.
const OUTBREAK_START = DAYS - 9;
const OUTBREAK_FACILITIES = {
  CHC05: { feverMult: 1.7, rashBase: 2.0 },
  PHC10: { feverMult: 1.9, rashBase: 1.6 },
  PHC11: { feverMult: 1.5, rashBase: 1.2 },
  PHC12: { feverMult: 1.4, rashBase: 0.9 },
};
const OUTBREAK_DRUGS = ["paracetamol_500", "ors_sachet", "iv_ns_500", "ns1_dengue", "ringer_lactate"];

// Single-day diarrhoea blip at CHC Junagarh (decoy the radar should NOT
// escalate - demonstrates it doesn't cry wolf).
const BLIP = { facility: "CHC07", day: DAYS - 2, syndrome: "diarrhoea", add: 9 };

// Near-expiry surplus batches (the expiry-waste story), modelled as a bulk
// push from the state warehouse arriving SEED_PUSH_DAY days before "today",
// sized at overFactor times what the facility can consume before expiry.
// After the push the facility stops indenting that drug (it is overstocked),
// so a genuine unconsumable surplus remains at day 90.
const SEED_PUSH_AGO = 40; // push arrived 40 days before today
const EXPIRY_SEEDS = [
  { facility: "CHC01", drug: "amoxicillin_500", daysToExpiry: 55, overFactor: 2.2 },
  { facility: "PHC04", drug: "iv_ns_500", daysToExpiry: 48, overFactor: 2.6 },
  { facility: "DHH01", drug: "act_kit", daysToExpiry: 65, overFactor: 1.9 },
  { facility: "CHC09", drug: "cotrimoxazole_480", daysToExpiry: 40, overFactor: 2.4 },
  { facility: "SDH01", drug: "ns1_dengue", daysToExpiry: 75, overFactor: 2.8 },
  { facility: "CHC03", drug: "doxycycline_100", daysToExpiry: 52, overFactor: 2.3 },
];

// ---- Simulation ----------------------------------------------------------

function isoOffset(daysFromToday) {
  return new Date(end.getTime() + daysFromToday * 86400000).toISOString().slice(0, 10);
}

let batchCounter = 0;
function newBatch(qty, expiryIso) {
  batchCounter += 1;
  return { id: "B" + String(batchCounter).padStart(4, "0"), qty: Math.round(qty), expiry: expiryIso };
}

// ---- Reporting accountability ------------------------------------------
// Every report is attributed to a named staff member. Some facilities are
// seeded as SILENT (no report for N days) so the compliance layer has
// blind spots to surface - including ones inside blocks that are flagging
// an outbreak, the most dangerous kind.
const REPORTER_NAMES = [
  "Sanjukta Behera", "Pradeep Nayak", "Laxmi Majhi", "Bibhuti Pradhan",
  "Anita Sahu", "Rakesh Meher", "Sunita Bag", "Debasis Rout", "Kabita Naik",
  "Manoj Patra", "Jyoti Mishra", "Santosh Dandsena", "Rina Harijan",
  "Ashok Bhoi", "Purnima Sethi", "Gopal Karsan",
];
const REPORTER_ROLES = ["Pharmacist", "ANM", "Staff Nurse", "MPHW (M)", "Medical Officer"];

// facility id -> days since last report (blind spots in alert-flagging blocks
// Thuamul Rampur, Kesinga come first; the rest are routine negligence).
const SILENT_SEEDS = { PHC13: 4, PHC05: 3, PHC22: 2, PHC16: 2 };

let facIndex = 0;
const facilitiesOut = {};

for (const fac of district.facilities) {
  const scale = (fac.catchment / 25000) * TYPE_MULT[fac.type];
  const chronicScale = fac.catchment / 25000;
  const footfallBase = 48 * scale;

  const series = { footfall: [], bedOccupied: [], doctorsPresent: [] };
  for (const s of SYNDROMES) series[s] = [];
  series.other = [];

  const doctorsSanctioned = DOCTORS_SANCTIONED[fac.type];
  const chronicAbsent = DOCTOR_SHORTFALL[fac.id] ?? 0;

  const outbreak = OUTBREAK_FACILITIES[fac.id];

  // --- daily activity ---
  for (let t = 0; t < DAYS; t++) {
    const date = days[t];
    const wf = weekdayFactor(date);
    const seasonal = 0.95 + 0.15 * (t / DAYS);
    let footfall = counts(footfallBase * wf * seasonal);

    const dayCounts = {};
    for (const s of SYNDROMES) {
      dayCounts[s] = counts(footfall * SHARE[s] * monsoonBoost(date, s));
    }

    if (outbreak && t >= OUTBREAK_START) {
      const ot = t - OUTBREAK_START;
      const ramp = 1 - Math.exp(-ot / 2.5);
      const feverAdd = counts(footfall * SHARE.fever * outbreak.feverMult * ramp);
      const rashAdd = Math.min(16, counts(outbreak.rashBase * Math.exp(ot / 3)));
      dayCounts.fever += feverAdd;
      dayCounts.fever_rash += rashAdd;
      footfall += Math.round((feverAdd + rashAdd) * 1.4);
    }

    if (fac.id === BLIP.facility && t === BLIP.day) {
      dayCounts[BLIP.syndrome] += BLIP.add;
    }

    const specific = SYNDROMES.reduce((a, s) => a + dayCounts[s], 0);
    const other = Math.max(0, footfall - specific);

    let occPressure = 1;
    if (outbreak && t >= OUTBREAK_START) {
      occPressure = 1 + 0.55 * (1 - Math.exp(-(t - OUTBREAK_START) / 3));
    }
    // Always draw the normal occupancy (keeps the seeded RNG sequence stable),
    // then override for facilities we want running hot.
    const normalOcc = Math.min(
      Math.round(fac.beds * 1.15),
      counts(fac.beds * BED_BASE_OCC[fac.type] * occPressure)
    );
    const bedOccupied = BED_PRESSURE[fac.id] ? Math.round(fac.beds * BED_PRESSURE[fac.id]) : normalOcc;

    // Doctors present: sanctioned minus chronic vacancies, minus the odd day of
    // unplanned absence. Deterministic (no rnd()) so it can't shift the seeded
    // sequence the rest of the data depends on.
    const doctorsPresent = Math.max(
      0,
      doctorsSanctioned - chronicAbsent - ((t * 7 + facIndex * 3) % 17 === 0 ? 1 : 0)
    );

    series.footfall.push(footfall);
    for (const s of SYNDROMES) series[s].push(dayCounts[s]);
    series.other.push(other);
    series.bedOccupied.push(bedOccupied);
    series.doctorsPresent.push(doctorsPresent);
  }

  // --- stock simulation (FEFO) ---
  const stock = {};
  for (const drug of drugCatalog) {
    if (!drug.tiers.includes(fac.type)) continue;

    // Expected daily burn at this facility, used to size initial stock/indents.
    let burn0 = drug.dailyBase * chronicScale;
    for (const [s, per] of Object.entries(drug.perCase)) {
      burn0 += per * footfallBase * SHARE[s];
    }
    const buffer = fac.type === "DHH" ? 1.6 : 1;

    let batches = [];
    const seed = EXPIRY_SEEDS.find((e) => e.facility === fac.id && e.drug === drug.id);
    {
      const initDays = uniform(25, 55) * buffer;
      const n = rnd() < 0.4 ? 2 : 1;
      for (let b = 0; b < n; b++) {
        batches.push(
          newBatch((burn0 * initDays) / n, isoOffset(Math.round(uniform(45, 500))))
        );
      }
    }

    const isOutbreakShort =
      outbreak && OUTBREAK_DRUGS.includes(drug.id); // last indent will be shorted

    const demandSeries = [];
    for (let t = 0; t < DAYS; t++) {
      // Overstock push from the state warehouse (expiry-waste seed).
      if (seed && t === DAYS - SEED_PUSH_AGO) {
        const qty = burn0 * (SEED_PUSH_AGO + seed.daysToExpiry * seed.overFactor);
        batches.push(newBatch(qty, isoOffset(seed.daysToExpiry)));
      }
      // Monthly indent arrives around day 6 of each 30-day cycle. Overstocked
      // facilities stop indenting the seeded drug after the push arrives.
      const cycleDay = t % 30;
      if (cycleDay === 6 && !(seed && t >= DAYS - SEED_PUSH_AGO)) {
        const isLastIndent = t >= DAYS - 30;
        const missed = rnd() < 0.08;
        if (!missed) {
          let qty = burn0 * 38 * uniform(0.85, 1.2) * buffer;
          if (isLastIndent && isOutbreakShort) qty *= 0.35;
          batches.push(newBatch(qty, isoOffset(Math.round(uniform(240, 540)))));
        }
      }

      // Demand for the day.
      let demand = drug.dailyBase * chronicScale;
      for (const [s, per] of Object.entries(drug.perCase)) {
        demand += per * series[s][t];
      }
      demand = Math.max(0, Math.round(demand * uniform(0.85, 1.15)));
      demandSeries.push(demand);

      // FEFO dispense: earliest expiry first; expired batches are removed.
      const today = days[t];
      batches = batches.filter((b) => b.expiry > today && b.qty > 0);
      batches.sort((a, b) => (a.expiry < b.expiry ? -1 : 1));
      let remaining = demand;
      for (const b of batches) {
        if (remaining <= 0) break;
        const take = Math.min(b.qty, remaining);
        b.qty -= take;
        remaining -= take;
      }
      batches = batches.filter((b) => b.qty > 0);
    }

    stock[drug.id] = {
      batches,
      consumption30: demandSeries.slice(-30),
    };
  }

  const alwaysReports = Boolean(outbreak) || fac.type === "DHH" || fac.type === "SDH";
  let lastReportDaysAgo;
  if (SILENT_SEEDS[fac.id] != null) lastReportDaysAgo = SILENT_SEEDS[fac.id];
  else if (alwaysReports) lastReportDaysAgo = 0;
  else {
    const r = rnd();
    lastReportDaysAgo = r < 0.8 ? 0 : r < 0.95 ? 1 : 2;
  }

  // Whoever last submitted for this facility - the person the district calls
  // when the centre is overdue.
  const lastReporter = {
    name: REPORTER_NAMES[facIndex % REPORTER_NAMES.length],
    role: REPORTER_ROLES[facIndex % REPORTER_ROLES.length],
    staffId: `KLH-${fac.type}-${String(1042 + facIndex * 7).padStart(4, "0")}`,
    photo: null,
  };
  facIndex += 1;

  facilitiesOut[fac.id] = {
    lastReportDaysAgo,
    lastReporter,
    doctorsSanctioned,
    series,
    stock,
  };
}

const out = {
  generatedAt: new Date().toISOString(),
  endDate,
  days,
  facilities: facilitiesOut,
};

fs.writeFileSync(path.join(__dirname, "records.json"), JSON.stringify(out));

// ---- Sanity summary ------------------------------------------------------

function last(arr, n) {
  return arr.slice(-n);
}
const chc05 = facilitiesOut.CHC05.series;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log("Generated", days.length, "days ending", endDate, "for", Object.keys(facilitiesOut).length, "facilities");
console.log(
  "CHC Lanjigarh fever today:",
  chc05.fever[DAYS - 1],
  "| baseline mean (30d before outbreak):",
  mean(chc05.fever.slice(OUTBREAK_START - 30, OUTBREAK_START)).toFixed(1)
);
console.log(
  "CHC Lanjigarh fever_rash last 9 days:",
  last(chc05.fever_rash, 9).join(",")
);
let expSoon = 0;
let expValue = 0;
for (const [fid, f] of Object.entries(facilitiesOut)) {
  for (const [did, s] of Object.entries(f.stock)) {
    const drug = drugCatalog.find((d) => d.id === did);
    for (const b of s.batches) {
      const dte = Math.round((new Date(b.expiry) - end) / 86400000);
      if (dte <= 90) {
        expSoon += 1;
        expValue += b.qty * drug.price;
      }
    }
  }
}
console.log("Batches expiring within 90 days:", expSoon, "| face value: Rs", Math.round(expValue).toLocaleString("en-IN"));
