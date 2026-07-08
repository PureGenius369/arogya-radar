# Arogya Radar — district health command centre for Kalahandi, Odisha

**The paper registers of every PHC already contain next week's outbreak. Nobody is reading them. We built the system that does.**

Built for **Build with AI: Code for Communities** — Track 3: Smart Health (AI for frontline health-system management).

## The problem

Primary Health Centres and Community Health Centres run on paper. Daily OPD registers, stock cards and bed counts never leave the facility in usable form — the digital reporting that does exist (HMIS, IDSP) is weekly or monthly, typed in late, and aggregated past the point of usefulness. Three consequences, all visible in a district like Kalahandi:

1. **Outbreaks are detected late.** When three centres in one block each see a small rise in fever-with-rash cases, that is a dengue signal days before any weekly report shows it. Today, nobody can see it.
2. **Medicines run out in one place while expiring in another.** District officers discover stockouts when a centre calls, and expiries when the audit happens.
3. **The data burden falls on the least-staffed tier.** Every new reporting requirement means another form for a pharmacist-cum-data-clerk who is also seeing patients.

## What Arogya Radar does

One web app, two sides:

**Facility side — reporting in 30 seconds.** Staff send the day's numbers as a **voice note in Odia, Hindi or English** or a **photo of the paper register**. Gemini's multimodal models parse either into a structured daily report (footfall, cases by IDSP-aligned symptom category, bed occupancy, stock on hand with expiries). The AI drafts, **staff confirm** — fields the model was unsure about are highlighted for human review before anything is saved.

**District side — the command centre.** Every confirmed report feeds four live analytics:

| Layer | What it answers | How |
|---|---|---|
| **Outbreak radar** | "What is flaring, where, since when?" | EARS-C2-family aberration detection (the statistics used by CDC/WHO surveillance): 21-day rolling baseline with a 7-day guard band per facility per syndrome, corroborated at block level — one noisy facility never raises an alert, three centres rising together do. |
| **Stock emergencies** | "Who runs out of what, when?" | Days-of-stock = on-hand ÷ 14-day burn rate, per drug per facility. |
| **Expiry waste (₹)** | "How much money is about to expire on shelves?" | FEFO simulation of every batch against its facility's burn rate; unconsumable units valued at procurement price. |
| **Redistribution** | "Which transfers fix both problems?" | Greedy matching: worst shortages first, nearest surplus holder, expiring stock offered before fresh stock, outbreak blocks pre-positioned to 21 days of cover for the relevant drugs. |

Plus a one-click **weekly brief** for the Collector/CDMO — Gemini turns the analytics into one page of plain language, in **English, Hindi or Odia**.

## Why the AI is not decorative

A deliberate division of labour:

- **Gemini does perception and language** — reading messy registers, understanding code-switched Odia/Hindi voice notes, writing briefs. The two tasks nothing else can do.
- **Detection and forecasting are classical, auditable statistics** — a district health officer must be able to see exactly why an alert fired ("87 fever cases today vs baseline 30.9 ± 7.9, flagged 3 days running, 3 of 3 centres in the block"). Real surveillance systems (CDC EARS, WHO EWARS) work this way, and so do we.

No GEMINI_API_KEY? The app runs in **mock mode**: intake and briefs return labelled canned outputs so the full flow always works; every analytic remains fully live.

## Demo scenario (synthetic, honestly labelled)

The repo ships with a 90-day simulated history for Kalahandi's real facility network. Seeded into it:

- A **dengue-like outbreak** ramping in Lanjigarh block over the final 8 days — the radar first flags it **7 days before "today"**, days before it would appear in any weekly report.
- **Near-expiry surplus** (a bulk push of dengue NS1 kits at SDH Dharamgarh, ACT courses at DHH Bhawanipatna, amoxicillin at CHC Kesinga…) worth **₹3.1 lakh** that current burn rates cannot consume.
- The radar's flagship recommendation writes itself: *move the expiring dengue test kits from the west of the district to the outbreak in the east* — expiry prevention and outbreak response in a single transfer.
- A one-day diarrhoea blip at CHC Junagarh that the radar correctly does **not** escalate.

### Data provenance

| Real | Synthetic |
|---|---|
| District, all 13 block names, DHH/SDH/CHC network structure | Daily facility-level activity (does not exist publicly — **that gap is the product's reason to exist**) |
| Medicine catalogue: NLEM 2022 subset, Jan Aushadhi-level prices | Some PHC names and all coordinates (approximate) |
| Syndrome categories aligned to IDSP reporting | The seeded outbreak & expiry scenarios |
| Magnitudes calibrated against HMIS monthly reports for Odisha ([data.gov.in](https://www.data.gov.in/catalog/item-wise-monthly-hmis-report-district-level-odisha)) and IDSP weekly outbreak archives | |

## Run it

```bash
npm install
npm run generate        # regenerate the 90-day synthetic history (deterministic)
cp .env.example .env    # add GEMINI_API_KEY for real AI intake/briefs (optional)
npm run dev             # http://localhost:3000
```

`npx tsx scripts/check.ts` prints the full analytics pipeline (alerts, shortages, expiry, transfers) in the terminal — the fastest way to see the radar fire.

## Deploy (Google Cloud Run)

```bash
gcloud run deploy arogya-radar --source . --region asia-south1 \
  --allow-unauthenticated --set-env-vars GEMINI_API_KEY=<your-key>
```

## Google Cloud technologies

Four Google Cloud services doing real work:

- **Gemini 2.5** (Pro + Flash, multimodal) — voice-note and register-photo parsing to strict JSON; multilingual brief generation
- **Cloud Run** — containerised, serverless deployment (Dockerfile included; the live public URL)
- **Maps JavaScript API** — the interactive district map: facility pins, outbreak-zone circles, and the case-intensity heatmap
- **Directions API** — real road route + distance/ETA for medicine transfers (falls back to OpenStreetMap/Leaflet if no Maps key is set)

Pilot roadmap: **Firestore** for durable storage, **BigQuery** for cross-district analytics, **Speech-to-Text + WhatsApp Business** intake channel, export to **IDSP/e-Aushadhi** formats.

## Architecture

```
voice note (or/hi/en) ─┐
                       ├─► Gemini multimodal ─► confirm screen ─► daily record store
register photo ────────┘        (perception)        (human)            │
                                                                       ▼
                                              ┌──────────────┬────────────────┬──────────────┐
                                              │ outbreak     │ stock burn &   │ redistribution│
                                              │ radar (EARS) │ expiry ₹ (FEFO)│ (greedy match)│
                                              └──────┬───────┴───────┬────────┴──────┬───────┘
                                                     ▼               ▼               ▼
                                        district map + alert feed + tables + Gemini weekly brief
```

## Repo map

- `data/generate.mjs` — deterministic synthetic-district simulator (calibration + seeded scenarios)
- `src/lib/radar.ts` — EARS-C2-style aberration detection with block corroboration
- `src/lib/stock.ts` — burn rates, FEFO expiry waste, transfer recommendations
- `src/lib/gemini.ts` — the only file that talks to an LLM (intake parsing + briefs, mock fallbacks)
- `src/app/` — command centre dashboard, intake flow, printable register template
- `scripts/check.ts` — terminal sanity harness for the whole pipeline

## Team

Mann Sutaria — solo build for Build with AI: Code for Communities 2026.
