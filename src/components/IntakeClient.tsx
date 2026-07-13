"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SYNDROMES, SYNDROME_LABELS, type Syndrome } from "@/lib/types";
import ReporterBlock, { type ReporterValue } from "./ReporterBlock";

interface FacilityOpt {
  id: string;
  name: string;
  type: string;
  block: string;
}
interface DrugOpt {
  id: string;
  name: string;
  unit: string;
  tiers: string[];
}

interface StockLine {
  drugId: string;
  onHand: number | null;
  expiry: string;
}

interface Draft {
  footfall: number | null;
  bedOccupied: number | null;
  syndromes: Partial<Record<Syndrome, number | null>>;
  stock: StockLine[];
  notes: string;
}

const EMPTY_DRAFT: Draft = { footfall: null, bedOccupied: null, syndromes: {}, stock: [], notes: "" };

type Tab = "voice" | "photo" | "manual";
type Step = "input" | "review" | "done";

export default function IntakeClient({
  facilities,
  drugs,
  today,
}: {
  facilities: FacilityOpt[];
  drugs: DrugOpt[];
  today: string;
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("voice");
  const [step, setStep] = useState<Step>("input");

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [parsing, setParsing] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [isMock, setIsMock] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState<string[]>([]);

  const [reporter, setReporter] = useState<ReporterValue>({ name: "", staffId: "", role: "", photo: null });
  const reporterComplete =
    reporter.name.trim() !== "" &&
    reporter.staffId.trim() !== "" &&
    reporter.role !== "" &&
    !!reporter.photo;

  const facility = facilities.find((f) => f.id === facilityId);
  const facilityDrugs = drugs.filter((d) => !facility || d.tiers.includes(facility.type));

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [audioUrl, photoUrl]);

  // ---- voice recording ----
  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone access was denied. You can upload an audio file or use manual entry instead.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  // ---- parsing ----
  async function parse(mode: "audio" | "image") {
    const file =
      mode === "audio"
        ? audioBlob && new File([audioBlob], "report.webm", { type: audioBlob.type || "audio/webm" })
        : photoFile;
    if (!file || !facility) return;

    setParsing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("facilityId", facility.id);
      form.set("mode", mode);
      form.set("file", file);
      const res = await fetch("/api/intake", { method: "POST", body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Parsing failed.");

      const r = data.report;
      setDraft({
        footfall: r.footfall ?? null,
        bedOccupied: r.bedOccupied ?? null,
        syndromes: r.syndromes ?? {},
        stock: (r.stock ?? []).map((l: { drugId: string; onHand: number; expiry?: string | null }) => ({
          drugId: l.drugId,
          onHand: l.onHand,
          expiry: l.expiry ?? "",
        })),
        notes: r.notes ?? "",
      });
      setTranscript(data.transcript ?? null);
      setUncertain(r.uncertain ?? []);
      setIsMock(Boolean(data.mock));
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parsing failed.");
    } finally {
      setParsing(false);
    }
  }

  // Bundled demo assets so a visitor without a mic, register, or Hindi can
  // still experience the real Gemini parse in two clicks. Both samples
  // describe PHC Biswanathpur, so the facility select follows along.
  async function loadSample(kind: "audio" | "image") {
    setSampleLoading(true);
    setError(null);
    try {
      const url = kind === "audio" ? "/samples/voice-sample.wav" : "/samples/register-sample.jpg";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      // The register photo is Biswanathpur-specific, so select it; the voice
      // note is facility-agnostic, so keep whatever facility the user chose.
      if (kind === "image" && facilities.some((f) => f.id === "PHC10")) setFacilityId("PHC10");
      if (kind === "audio") {
        const f = new File([blob], "voice-sample.wav", { type: "audio/wav" });
        setAudioBlob(f);
        setAudioUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(f);
        });
      } else {
        const f = new File([blob], "register-sample.jpg", { type: "image/jpeg" });
        setPhotoFile(f);
        setPhotoUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(f);
        });
      }
    } catch {
      setError("Could not load the sample file.");
    } finally {
      setSampleLoading(false);
    }
  }

  function startManual() {
    setDraft(EMPTY_DRAFT);
    setTranscript(null);
    setUncertain([]);
    setIsMock(false);
    setStep("review");
  }

  // ---- submit ----
  async function submit() {
    if (!facility) return;
    if (!reporterComplete) {
      setError("Please add the reporter's name, staff ID, role and an on-the-spot photo before sending.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        facilityId: facility.id,
        date: today,
        footfall: draft.footfall,
        bedOccupied: draft.bedOccupied,
        syndromes: Object.fromEntries(
          Object.entries(draft.syndromes).filter(([, v]) => v != null)
        ),
        stock: draft.stock
          .filter((l) => l.drugId && l.onHand != null)
          .map((l) => ({ drugId: l.drugId, onHand: l.onHand, expiry: l.expiry || null })),
        notes: draft.notes || null,
        uncertain,
        reporter: {
          name: reporter.name.trim(),
          staffId: reporter.staffId.trim(),
          role: reporter.role,
          photo: reporter.photo,
        },
      };
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not save the report.");
      setApplied(data.applied);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the report.");
    } finally {
      setSubmitting(false);
    }
  }

  function numInput(v: number | null, set: (n: number | null) => void, cls = "") {
    return (
      <input
        type="number"
        min={0}
        className={cls}
        value={v ?? ""}
        onChange={(e) => set(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
      />
    );
  }

  // ---------------------------------------------------------------- done --
  if (step === "done" && facility) {
    return (
      <div className="card">
        <div className="notice ok">
          Report saved for <strong>{facility.name}</strong> ({today}). Updated: {applied.join(", ")}.
        </div>
        <p>
          The district dashboard has already recalculated — outbreak radar, stock forecasts and
          transfer recommendations now include this report.
        </p>
        <p style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/">
            See what the district sees
          </Link>
          <button
            className="btn secondary"
            onClick={() => {
              setStep("input");
              setAudioBlob(null);
              setAudioUrl(null);
              setPhotoFile(null);
              setPhotoUrl(null);
              setDraft(EMPTY_DRAFT);
            }}
          >
            Submit another report
          </button>
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------- review --
  if (step === "review" && facility) {
    const unc = (key: string) => (uncertain.includes(key) ? "uncertain" : "");
    return (
      <div className="card">
        <h2>
          Confirm before saving — {facility.name}, {today}
        </h2>
        <p className="sub">
          AI drafts, staff confirm. Amber fields are ones the AI was unsure about — please check
          them against the register.
        </p>
        {isMock && (
          <div className="notice warn">
            Mock mode: no GEMINI_API_KEY is set, so this draft is canned demo data. The
            confirm-and-save flow is fully live.
          </div>
        )}
        {transcript && (
          <div className="notice info">
            <strong>What the AI heard/read:</strong> {transcript}
          </div>
        )}
        {uncertain.length > 0 && (
          <div className="notice warn">Please verify: {uncertain.join(", ")}</div>
        )}
        {reporterComplete ? (
          <div className="notice info" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {reporter.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reporter.photo}
                alt="Reporter"
                style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <span>
              Recorded by <strong>{reporter.name}</strong> · {reporter.role} ({reporter.staffId})
            </span>
          </div>
        ) : (
          <div className="notice warn">
            Reporter details are required — go Back and add name, staff ID, role and a photo.
          </div>
        )}

        <div className="grid-2col">
          <div>
            <label className="fld">Total OPD footfall today</label>
            {numInput(draft.footfall, (n) => setDraft({ ...draft, footfall: n }), unc("footfall"))}
          </div>
          <div>
            <label className="fld">Beds occupied right now</label>
            {numInput(draft.bedOccupied, (n) => setDraft({ ...draft, bedOccupied: n }), unc("bedOccupied"))}
          </div>
        </div>

        <label className="fld">Cases by symptom category</label>
        <div className="syn-grid">
          {SYNDROMES.map((s) => (
            <div key={s}>
              <label className="fld" style={{ marginTop: 0 }}>
                {SYNDROME_LABELS[s]}
              </label>
              {numInput(
                draft.syndromes[s] ?? null,
                (n) => setDraft({ ...draft, syndromes: { ...draft.syndromes, [s]: n } }),
                unc(s)
              )}
            </div>
          ))}
        </div>

        <label className="fld">Medicine stock on hand (only lines being updated)</label>
        {draft.stock.map((line, i) => (
          <div className="stock-line" key={i}>
            <select
              value={line.drugId}
              onChange={(e) => {
                const stock = [...draft.stock];
                stock[i] = { ...line, drugId: e.target.value };
                setDraft({ ...draft, stock });
              }}
            >
              <option value="">— choose medicine —</option>
              {facilityDrugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              placeholder="on hand"
              className={unc("stock." + line.drugId)}
              value={line.onHand ?? ""}
              onChange={(e) => {
                const stock = [...draft.stock];
                stock[i] = { ...line, onHand: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) };
                setDraft({ ...draft, stock });
              }}
            />
            <input
              type="date"
              title="Earliest expiry (optional)"
              value={line.expiry}
              onChange={(e) => {
                const stock = [...draft.stock];
                stock[i] = { ...line, expiry: e.target.value };
                setDraft({ ...draft, stock });
              }}
            />
            <button
              className="btn sm danger"
              onClick={() => setDraft({ ...draft, stock: draft.stock.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className="btn sm secondary"
          onClick={() =>
            setDraft({ ...draft, stock: [...draft.stock, { drugId: "", onHand: null, expiry: "" }] })
          }
        >
          + Add medicine line
        </button>

        <label className="fld">Notes</label>
        <textarea
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />

        {error && <div className="notice error" style={{ marginTop: 12 }}>{error}</div>}
        <p style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : "Confirm & send to district"}
          </button>
          <button className="btn secondary" onClick={() => setStep("input")} disabled={submitting}>
            Back
          </button>
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------- input --
  return (
    <div className="card">
      <label className="fld">Reporting facility</label>
      <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
        {facilities.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} — {f.block} block ({f.type})
          </option>
        ))}
      </select>

      <ReporterBlock value={reporter} onChange={setReporter} />

      <div className="tabs" style={{ marginTop: 16 }}>
        <button className={tab === "voice" ? "active" : ""} onClick={() => setTab("voice")}>
          🎙 Voice note
        </button>
        <button className={tab === "photo" ? "active" : ""} onClick={() => setTab("photo")}>
          📷 Register photo
        </button>
        <button className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>
          ⌨ Manual entry
        </button>
      </div>

      {tab === "voice" && (
        <div>
          <p className="sub">
            Speak today&apos;s numbers in <strong>Odia, Hindi or English</strong> — footfall, cases
            by symptom, medicine stock. Example: “Aaji OPD 64 rogi, jwara 18, jhada 6. Paracetamol
            350 tablet baki achhi.”
          </p>
          <div className="rec-controls">
            {!recording ? (
              <button className="btn" onClick={startRecording}>
                ● Start recording
              </button>
            ) : (
              <button className="btn danger" onClick={stopRecording}>
                ■ Stop
              </button>
            )}
            {recording && (
              <span>
                <span className="rec-dot" /> recording…
              </span>
            )}
            {audioUrl && !recording && <audio controls src={audioUrl} />}
          </div>
          <p className="sub" style={{ marginTop: 10 }}>
            No mic handy?{" "}
            <button className="btn sm secondary" onClick={() => loadSample("audio")} disabled={sampleLoading}>
              {sampleLoading ? "Loading…" : "▶ Load a sample voice note"}
            </button>
          </p>
          <p className="sub">…or upload a voice note file:</p>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f) {
                setAudioBlob(f);
                setAudioUrl((old) => {
                  if (old) URL.revokeObjectURL(old);
                  return URL.createObjectURL(f);
                });
              }
            }}
          />
          <p style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => parse("audio")} disabled={!audioBlob || parsing}>
              {parsing ? "Gemini is listening…" : "Parse with Gemini →"}
            </button>
          </p>
        </div>
      )}

      {tab === "photo" && (
        <div>
          <p className="sub">
            Photograph the daily register page — the AI reads handwriting, Odia or English headers,
            and drafts the report for confirmation. (Need a sheet?{" "}
            <Link href="/register-template">Print the register template</Link>.)
          </p>
          <p className="sub">
            No register handy?{" "}
            <button className="btn sm secondary" onClick={() => loadSample("image")} disabled={sampleLoading}>
              {sampleLoading ? "Loading…" : "Load a sample register photo"}
            </button>
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPhotoFile(f);
              setPhotoUrl((old) => {
                if (old) URL.revokeObjectURL(old);
                return f ? URL.createObjectURL(f) : null;
              });
            }}
          />
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Register page preview"
              style={{ maxWidth: "100%", maxHeight: 320, marginTop: 10, borderRadius: 8 }}
            />
          )}
          <p style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => parse("image")} disabled={!photoFile || parsing}>
              {parsing ? "Gemini is reading…" : "Parse with Gemini →"}
            </button>
          </p>
        </div>
      )}

      {tab === "manual" && (
        <div>
          <p className="sub">Type the numbers directly — same form the AI drafts into.</p>
          <button className="btn" onClick={startManual}>
            Open blank report form →
          </button>
        </div>
      )}

      {error && <div className="notice error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
