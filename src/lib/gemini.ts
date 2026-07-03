// Gemini does exactly two jobs in Arogya Radar - the two things an LLM is
// genuinely best at:
//   1. Perception: voice note (Odia/Hindi/English) or register photo -> a
//      structured daily report (strict JSON).
//   2. Language: analytics JSON -> a plain-language weekly brief for the
//      district administration.
// Detection and forecasting are classical statistics (see radar.ts,
// stock.ts) so that every alert is auditable.
//
// Without GEMINI_API_KEY the module runs in mock mode: canned but realistic
// outputs keep the full UI flow working, and every response is labelled
// mock so nobody is misled.

import { GoogleGenAI } from "@google/genai";
import type { Drug, Facility, IntakeReport, Syndrome } from "./types";
import { SYNDROMES, SYNDROME_LABELS } from "./types";

// Trim so a stray space/newline from a shell echo or editor can't corrupt
// the key or leave it looking "set" while failing at the API.
const apiKey = process.env.GEMINI_API_KEY?.trim();
export const geminiEnabled = Boolean(apiKey && apiKey.length > 10 && apiKey !== "PASTE_YOUR_KEY_HERE");

// Both jobs default to Flash: it handles multimodal intake (Odia/Hindi voice,
// register photos) well and has generous free-tier quota. Pro is marginally
// sharper on the worst handwriting but the free Gemini tier grants it almost
// no quota (429s immediately) - it needs billing enabled. If you enable
// billing, set GEMINI_INTAKE_MODEL=gemini-2.5-pro to upgrade intake accuracy.
// GEMINI_MODEL, if set, overrides both.
const OVERRIDE = process.env.GEMINI_MODEL;
const INTAKE_MODEL = OVERRIDE || process.env.GEMINI_INTAKE_MODEL || "gemini-2.5-flash";
const BRIEF_MODEL = OVERRIDE || process.env.GEMINI_BRIEF_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: apiKey! });
  return client;
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function clampInt(v: unknown, max = 100000): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return Math.min(max, Math.round(n));
}

// ---- Intake parsing --------------------------------------------------------

const SYNDROME_HINTS: Record<string, string> = {
  fever: "fever / jwara / ଜ୍ୱର / bukhar",
  fever_rash: "fever WITH rash or body spots / daag ke saath bukhar / ଜ୍ୱର ସହ ଦାଗ",
  diarrhoea: "loose motion, diarrhoea / dast / ଝାଡ଼ା",
  ari: "cough, cold, breathing trouble / khansi / କାଶ",
  jaundice: "jaundice, yellow eyes / piliya / କାମଳ",
  snakebite: "snake bite / saanp kata / ସାପ କାମୁଡ଼ା",
  maternal: "pregnant women ANC checkup / garbhvati janch",
  injury: "injury, accident, wound / chot",
};

function intakePrompt(mode: "audio" | "image", facility: Facility, drugs: Drug[], today: string): string {
  const drugList = drugs
    .filter((d) => d.tiers.includes(facility.type))
    .map((d) => `${d.id} = ${d.name} (${d.unit})`)
    .join("\n");
  const synList = SYNDROMES.map((s) => `${s}: ${SYNDROME_HINTS[s]}`).join("\n");
  const source =
    mode === "audio"
      ? `The attached audio is a voice note from a staff member at ${facility.name} (a ${facility.type} in Kalahandi district, Odisha) reporting today's activity. The speaker may use Odia, Hindi, English, or a mix (including code-switching and local medicine names).`
      : `The attached image is a photo of a page from the paper daily register of ${facility.name} (a ${facility.type} in Kalahandi district, Odisha). Handwriting may be messy; headers may be in Odia or English.`;

  return `${source}

Today's date is ${today}. Extract the daily report as JSON with EXACTLY this shape:
{
  "transcript": string,           // audio: faithful transcription (original language); image: brief description of what the page shows
  "footfall": number | null,      // total OPD patients seen today
  "syndromes": {                  // patient counts by symptom category (IDSP-aligned). null if not mentioned/legible.
    "fever": number | null, "fever_rash": number | null, "diarrhoea": number | null,
    "ari": number | null, "jaundice": number | null, "snakebite": number | null,
    "maternal": number | null, "injury": number | null
  },
  "bedOccupied": number | null,   // inpatient beds currently occupied
  "stock": [                      // ONLY medicines actually mentioned, matched to the catalogue below
    { "drugId": string, "onHand": number, "expiry": "YYYY-MM-DD" | null }
  ],
  "notes": string | null,         // anything important that does not fit the fields (referrals, deaths, staff issues)
  "uncertain": string[]           // field names you are NOT confident about (e.g. "footfall", "stock.paracetamol_500")
}

Symptom category meanings (with common Odia/Hindi terms):
${synList}

Medicine catalogue (use drugId exactly; skip medicines not in this list but mention them in notes):
${drugList}

Rules:
- Numbers must be plain integers. Never invent values: if something is not stated or not legible, use null and add the field to "uncertain".
- "fever_rash" counts fever cases WITH rash separately from plain "fever". Do not double count: a fever-with-rash case goes only in fever_rash.
- Convert spoken number words in any language ("pachattar", "ପଚାଶ") to digits.
- Output ONLY the JSON object, no markdown fences, no commentary.`;
}

export interface IntakeParseResult {
  report: IntakeReport;
  transcript: string | null;
  mock: boolean;
}

function mockIntake(facility: Facility, today: string): IntakeParseResult {
  const isChc = facility.type !== "PHC";
  return {
    mock: true,
    transcript:
      "(mock mode — add GEMINI_API_KEY for real parsing) Namaskar, aaji " +
      facility.name +
      " re OPD 64 rogi. Jwara 18 jana, jwara-daag 4 jana, jhada 6, kaasi 9. Paracetamol 350 tablet achhi, ORS 80 packet, expiry August sesa. Dhanyabad.",
    report: {
      facilityId: facility.id,
      date: today,
      footfall: 64,
      syndromes: { fever: 18, fever_rash: 4, diarrhoea: 6, ari: 9 },
      bedOccupied: isChc ? 21 : 3,
      stock: [
        { drugId: "paracetamol_500", onHand: 350, expiry: null },
        { drugId: "ors_sachet", onHand: 80, expiry: today.slice(0, 4) + "-08-31" },
      ],
      notes: "Mock parse. One suspected dengue case referred to DHH.",
      uncertain: ["stock.ors_sachet"],
    },
  };
}

export async function parseIntake(opts: {
  mode: "audio" | "image";
  base64: string;
  mimeType: string;
  facility: Facility;
  drugs: Drug[];
  today: string;
}): Promise<IntakeParseResult> {
  if (!geminiEnabled) return mockIntake(opts.facility, opts.today);

  const res = await ai().models.generateContent({
    model: INTAKE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: opts.mimeType, data: opts.base64 } },
          { text: intakePrompt(opts.mode, opts.facility, opts.drugs, opts.today) },
        ],
      },
    ],
    config: { temperature: 0, responseMimeType: "application/json" },
  });

  const raw = stripFences(res.text ?? "");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned unparseable output. Try again or use manual entry.");
  }

  const validDrugIds = new Set(opts.drugs.map((d) => d.id));
  const syndromes: Partial<Record<Syndrome, number>> = {};
  const rawSyn = (parsed.syndromes ?? {}) as Record<string, unknown>;
  for (const s of SYNDROMES) {
    const v = clampInt(rawSyn[s], 5000);
    if (v != null) syndromes[s] = v;
  }

  const stock = Array.isArray(parsed.stock)
    ? (parsed.stock as Record<string, unknown>[])
        .filter((l) => typeof l?.drugId === "string" && validDrugIds.has(l.drugId as string))
        .map((l) => ({
          drugId: l.drugId as string,
          onHand: clampInt(l.onHand, 1000000) ?? 0,
          expiry:
            typeof l.expiry === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.expiry) ? l.expiry : null,
        }))
        .filter((l) => l.onHand >= 0)
    : [];

  return {
    mock: false,
    transcript: typeof parsed.transcript === "string" ? parsed.transcript : null,
    report: {
      facilityId: opts.facility.id,
      date: opts.today,
      footfall: clampInt(parsed.footfall, 100000),
      syndromes,
      bedOccupied: clampInt(parsed.bedOccupied, 10000),
      stock,
      notes: typeof parsed.notes === "string" ? parsed.notes : null,
      uncertain: Array.isArray(parsed.uncertain)
        ? (parsed.uncertain as unknown[]).filter((u): u is string => typeof u === "string")
        : [],
    },
  };
}

// ---- Weekly brief ----------------------------------------------------------

const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", or: "Odia" };

export async function generateBrief(payload: object, language: string): Promise<{ text: string; mock: boolean }> {
  if (!geminiEnabled) {
    return { text: mockBrief(payload), mock: true };
  }
  const lang = LANG_NAME[language] ?? "English";
  const prompt = `You are writing the weekly district health brief for the District Collector and CDMO of Kalahandi district, Odisha. They are busy non-technical administrators: plain language, short sentences, no jargon, no markdown tables.

Write in ${lang}. Structure (use these numbered sections with short headings):
1. Outbreak radar — what is flaring, where, since when, and how confident we are. Lead with the single most important thing.
2. Stock emergencies — which centres run out of which medicines in the next 7 days.
3. Money being lost — medicines that will expire unused, with rupee values.
4. Actions for this week — a numbered, concrete to-do list (transfers to approve, teams to send, calls to make). Reference specific facilities and quantities.

Keep it to roughly one page. Use ₹ with Indian digit grouping. Do not invent any numbers not present in the data. Today's data:

${JSON.stringify(payload, null, 1)}`;

  const res = await ai().models.generateContent({
    model: BRIEF_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3 },
  });
  return { text: res.text ?? "", mock: false };
}

// Deterministic fallback so the brief button always works.
function mockBrief(payload: object): string {
  const p = payload as {
    endDate?: string;
    alerts?: { severity: string; block: string; label: string; message: string }[];
    shortages?: { facilityName: string; drugName: string; daysOfStock: number }[];
    expiryTotal?: number;
    transfers?: { drugName: string; qty: number; unit: string; fromName: string; toName: string; valueSaved: number }[];
  };
  const lines: string[] = [];
  lines.push(`KALAHANDI DISTRICT HEALTH BRIEF — week ending ${p.endDate ?? ""}`);
  lines.push(`(mock mode — add GEMINI_API_KEY for AI-written briefs in English/Hindi/Odia)`);
  lines.push("");
  lines.push("1. OUTBREAK RADAR");
  for (const a of (p.alerts ?? []).slice(0, 4)) {
    lines.push(`   [${a.severity.toUpperCase()}] ${a.block}: ${a.label}. ${a.message}`);
  }
  lines.push("");
  lines.push("2. STOCK EMERGENCIES (next 7 days)");
  for (const s of (p.shortages ?? []).slice(0, 6)) {
    lines.push(`   ${s.facilityName}: ${s.drugName} — ${s.daysOfStock} days of stock left.`);
  }
  lines.push("");
  lines.push("3. MONEY BEING LOST");
  lines.push(
    `   Medicines worth ₹${(p.expiryTotal ?? 0).toLocaleString("en-IN")} will expire unused within 120 days unless redistributed.`
  );
  lines.push("");
  lines.push("4. ACTIONS FOR THIS WEEK");
  (p.transfers ?? []).slice(0, 5).forEach((t, i) => {
    lines.push(
      `   ${i + 1}. Approve transfer: ${t.qty} ${t.unit} ${t.drugName} from ${t.fromName} to ${t.toName}` +
        (t.valueSaved > 0 ? ` (saves ₹${t.valueSaved.toLocaleString("en-IN")})` : "") +
        "."
    );
  });
  return lines.join("\n");
}
