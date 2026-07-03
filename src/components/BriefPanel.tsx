"use client";

import { useState } from "react";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "or", label: "ଓଡ଼ିଆ" },
];

export default function BriefPanel() {
  const [language, setLanguage] = useState("en");
  const [brief, setBrief] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(lang: string) {
    setLanguage(lang);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Brief generation failed.");
      setBrief(data.brief);
      setMock(Boolean(data.mock));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="brief-langs">
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={`btn sm ${language === l.code ? "" : "secondary"}`}
            disabled={loading}
            onClick={() => generate(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>
      {loading && <p className="sub">Writing the brief…</p>}
      {error && <div className="notice error">{error}</div>}
      {mock && brief && (
        <div className="notice warn">
          Mock brief (no GEMINI_API_KEY set). The numbers are real; the prose is a template.
        </div>
      )}
      {brief ? (
        <div className="brief-output">{brief}</div>
      ) : (
        !loading && (
          <p className="sub">
            One click turns today&apos;s radar, stock and expiry picture into a plain-language brief
            for the Collector and CDMO — in English, Hindi or Odia.
          </p>
        )
      )}
    </div>
  );
}
