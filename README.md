# Arogya Radar — Gujarat state health radar

**The paper registers of every PHC already contain next week's outbreak. Nobody is reading them in time. We built the system that does — and put all 33 districts of Gujarat on one screen, ready to switch on.**

A district-health command centre for Gujarat: AI intake at the facility, classical outbreak surveillance and medicine-redistribution analytics at the district, and a statewide coverage map. **Dahod is the live pilot district**; the other 32 are on the map, waiting to be switched on one block at a time.

Originally built for **Build with AI: Code for Communities** — Track 3: Smart Health.

## The problem

Primary Health Centres and Community Health Centres run on paper. Daily OPD registers, stock cards and bed counts never leave the facility in usable form — the digital reporting that does exist (HMIS, IDSP/IHIP) is weekly or monthly, typed in late, and aggregated past the point of usefulness. Three consequences, all visible in a tribal district like Dahod:

1. **Outbreaks are detected late.** When three centres in one block each see a small rise in fever-with-rash cases, that is a dengue signal days before any weekly report shows it. Today, nobody can see it.
2. **Medicines run out in one place while expiring in another.** District officers discover stockouts when a centre calls, and expiries when the audit happens.
3. **The data burden falls on the least-staffed tier.** Every new reporting requirement means another form for a pharmacist-cum-data-clerk who is also seeing patients.

## Two levels: a state you can light up, a district that proves it

**State view (all 33 districts).** Every district of Gujarat is on the map, drawn from the government's own health-centre directory — real names, real facility network. Dahod glows: real facility reports are flowing through the radar. The rest are dark, waiting. The pitch is the picture: *light up Gujarat, one block at a time.* We do not fabricate statewide activity — a real skeleton with one live district is more credible, and more honest, than 33 districts of invented numbers.

**Dahod (the live pilot).** The full command centre runs on Dahod's real facility network — District Hospital + SDH Devgadh Baria + 12 CHCs + PHCs across 9 tribal talukas (Dahod, Devgadh Baria, Dhanpur, Fatepura, Garbada, Jhalod, Limkheda, Singvad, Sanjeli).

### Facility side — reporting in 30 seconds

Staff send the day's numbers as a **voice note in Gujarati, Hindi or English** or a **photo of the paper register**. Gemini's multimodal models parse either into a structured daily report (footfall, cases by IDSP-aligned symptom category, bed occupancy, stock on hand with expiries). The AI drafts, **staff confirm** — fields the model was unsure about are highlighted for human review before anything is saved. Every report is attributed to a named staff member with an on-the-spot photo.

### District side — the command centre

Every confirmed report feeds four live analytics:

| Layer | What it answers | How |
|---|---|---|
| **Outbreak radar** | "What is flaring, where, since when?" | EARS-C2-family aberration detection (the statistics used by CDC/WHO surveillance): 21-day rolling baseline with a 7-day guard band per facility per syndrome, corroborated at block level — one noisy facility never raises an alert, three centres rising together do. |
| **Stock emergencies** | "Who runs out of what, when?" | Days-of-stock = on-hand ÷ 14-day burn rate, per drug per facility. |
| **Expiry waste (₹)** | "How much money is about to expire on shelves?" | FEFO simulation of every batch against its facility's burn rate; unconsumable units valued at procurement price. |
| **Redistribution** | "Which transfers fix both problems?" | Greedy matching: worst shortages first, nearest surplus holder, expiring stock offered before fresh stock, outbreak blocks pre-positioned to 21 days of cover for the relevant drugs. |

Plus a one-click **weekly brief** for the Collector/CDMO — Gemini turns the analytics into one page of plain language, in **English, Hindi or Gujarati**.

## How this fits what Gujarat already runs

Arogya Radar is **not a replacement** for HMIS / IDSP / IHIP / e-Aushadhi. It is the **last-mile layer** that finally makes their daily reporting actually happen, then exports into them. It is read-only augmentation of what facilities already do on paper — it changes nothing they run, it only makes the register they already fill in visible in time to act. Adoption path: a no-cost, read-only pilot in one Dahod block, blessed by the CDMO/Collector, proving one outcome number (an outbreak flagged N days before HMIS; ₹X of expiry prevented; reporting compliance up).

## Why the AI is not decorative

A deliberate division of labour:

- **Gemini does perception and language** — reading messy registers, understanding code-switched Gujarati/Hindi voice notes, and writing briefs: the things nothing else can do.
- **Detection and forecasting are classical, auditable statistics** — a district health officer must be able to see exactly why an alert fired ("284 fever cases today vs a baseline near 94, flagged 3 days running, 5 of 7 centres in Jhalod block"). Real surveillance systems (CDC EARS, WHO EWARS) work this way, and so do we.

No GEMINI_API_KEY? The app runs in **mock mode**: intake and briefs return labelled canned outputs so the full flow always works; every analytic remains fully live.

## Demo scenario (synthetic activity, honestly labelled)

The repo ships with a 90-day simulated history for Dahod's real facility network. Seeded into it:

- A **dengue-like outbreak** ramping in **Jhalod block** (tribal, near the MP border — real malaria/dengue territory) over the final 8 days — the radar first flags it **7 days before "today"**, days before it would appear in any weekly report.
- **Near-expiry surplus** — dengue NS1 kits at SDH Devgadh Baria worth **₹1.65 lakh**, ACT courses at District Hospital Dahod, amoxicillin at CHC Dudhamali… ₹3+ lakh that current burn rates cannot consume.
- The radar's flagship recommendation writes itself: *move the expiring dengue test kits from Devgadh Baria in the west to the outbreak in Jhalod in the east* — expiry prevention and outbreak response in a single transfer.
- A **reporting blind spot** at PHC Chakaliya — silent 3 days, *inside* the alerting Jhalod block, the most dangerous kind.
- A one-day diarrhoea blip that the radar correctly does **not** escalate.

### Data provenance

| Real | Synthetic |
|---|---|
| All 33 Gujarat districts; Dahod's 9 talukas and DH/SDH/CHC/PHC network structure | Daily facility-level activity (does not exist publicly — **that gap is the product's reason to exist**) |
| PHC/CHC names from the Gujarat Health Dept district- & taluka-wise list of 1,474 PHCs (15-08-2018) | Facility coordinates (approximate to taluka HQ pending a GPS import) |
| Statewide totals (33 districts, 1,474 PHCs, 273 CHCs, 23 SDH, 23 DH) from NHM / Gujarat Health Dept | The seeded outbreak, expiry and blind-spot scenarios |
| Medicine catalogue: NLEM 2022 subset, Jan Aushadhi-level prices; syndrome categories aligned to IDSP | |

Sources: [Gujarat Health Dept 1,474-PHC list](https://gujhealth.gujarat.gov.in/images/pdf/1474-list-18.pdf) · [NHM Gujarat report](https://nhm.gov.in/images/pdf/nrhm-in-state/state-wise-information/gujarat/gujarat-report.pdf) · [Dahod district health portal](https://dahod.nic.in/health/).

## Run it

```bash
npm install
npm run generate        # regenerate the 90-day synthetic Dahod history (deterministic)
cp .env.example .env    # add GEMINI_API_KEY for real AI intake/briefs (optional)
npm run dev             # http://localhost:3000
```

`npx tsx scripts/check.ts` prints the full analytics pipeline (alerts, shortages, expiry, transfers) in the terminal — the fastest way to see the radar fire.

- `/` — Gujarat state radar (33 districts, Dahod live)
- `/district/dahod` — the Dahod command centre
- `/intake` — the 30-second facility report (voice / register photo / manual)

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

Pilot roadmap: **WhatsApp Business + Speech-to-Text** intake channel (zero-install for PHC staff), **Firestore** for durable storage and auth, **BigQuery** for cross-district analytics, export to **IHIP/IDSP/e-Aushadhi** formats.

## Architecture

```
                          ┌──────────────── STATE VIEW ────────────────┐
                          │  33 Gujarat districts · Dahod live · rest  │
                          │  dark, waiting to be switched on           │
                          └───────────────────┬────────────────────────┘
                                              │ drill into the live district
voice note (gu/hi/en) ─┐                      ▼
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

- `data/gujarat.json` — the 33-district statewide skeleton (real districts + centroids + Dahod live flag)
- `data/district.json` — Dahod's real facility network (talukas, CHC/PHC names from the govt list)
- `data/generate.mjs` — deterministic synthetic-activity simulator (calibration + seeded scenarios)
- `src/lib/radar.ts` — EARS-C2-style aberration detection with block corroboration
- `src/lib/stock.ts` — burn rates, FEFO expiry waste, transfer recommendations
- `src/lib/gemini.ts` — the only file that talks to an LLM (intake parsing + briefs, mock fallbacks)
- `src/app/page.tsx` — the Gujarat state radar; `src/app/district/[id]` — the district command centre
- `scripts/check.ts` — terminal sanity harness for the whole pipeline

## Team

Mann Sutaria — solo build.
