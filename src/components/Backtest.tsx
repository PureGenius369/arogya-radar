// Retrospective "how early did we catch it" view. Honestly a back-test on the
// calibrated Dahod scenario: it shows the lead time the method buys over the
// routine weekly reporting cycle. Real validation runs on IHIP/IDSP historical
// archives during the pilot (stated in the caption).

function fmt(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Backtest({
  endDate,
  block,
  radarLead,
  consumptionLead,
}: {
  endDate: string;
  block: string;
  radarLead: number;
  consumptionLead: number;
}) {
  const earliest = Math.max(radarLead, consumptionLead);
  if (earliest <= 0) return null;

  // Next Monday from "today" — when the weekly report covering this period is
  // first compiled and reviewed.
  const dow = new Date(endDate + "T00:00:00Z").getUTCDay();
  const daysToNextMonday = ((8 - dow) % 7) || 7;

  const milestones = [
    { kind: "onset", date: addDays(endDate, -earliest), label: "Cases begin rising" },
    {
      kind: "detect",
      date: addDays(endDate, -consumptionLead),
      label: "Consumption radar flags (no reports needed)",
    },
    { kind: "detect", date: addDays(endDate, -radarLead), label: "Syndromic radar flags" },
    { kind: "today", date: endDate, label: "Today" },
    {
      kind: "late",
      date: addDays(endDate, daysToNextMonday),
      label: "Earliest a weekly report is compiled",
    },
  ];

  return (
    <div className="card">
      <h2>Retrospective: how much earlier the radar sees it</h2>
      <div className="backtest">
        <div className="bt-headline">
          <div className="bt-num">≈{earliest} days</div>
          <div className="bt-cap">
            of warning before the routine weekly cycle even looks at {block} block
          </div>
        </div>
        <div className="bt-track">
          {milestones.map((m, i) => (
            <div key={i} className={`bt-step ${m.kind}`}>
              <div className="bt-date">{fmt(m.date)}</div>
              <div className="bt-dot" />
              <div className="bt-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>
        Back-test on the calibrated Dahod scenario, demonstrating the method&apos;s lead time. In a
        pilot this is validated the honest way — replaying the radar over the state&apos;s own
        historical IHIP/IDSP outbreak archives to measure how many days earlier it would have fired.
      </p>
    </div>
  );
}
