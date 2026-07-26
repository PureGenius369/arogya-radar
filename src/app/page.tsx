import Link from "next/link";
import { getStore } from "@/lib/store";
import { buildDashboard } from "@/lib/analytics";
import StateMap from "@/components/StateMap";

export const dynamic = "force-dynamic";

function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export default function StateRadar() {
  const store = getStore();
  const { state } = store;
  const dash = buildDashboard(store);

  const liveCount = state.districts.filter((d) => d.live).length;
  const waiting = state.totals.districts - liveCount;
  const flagship = state.districts.find((d) => d.id === state.flagship);

  return (
    <div>
      <div className="page-head">
        <h1>Gujarat state health radar</h1>
        <span className="asof">
          Real-time outbreak, stock and expiry surveillance for every public health facility in
          Gujarat · data as of {dash.endDate}
        </span>
      </div>

      <div className="state-hero card">
        <div className="hero-stat">
          <div className="big">
            {liveCount} <span className="of">live</span>
          </div>
          <div className="small">{waiting} districts waiting to be switched on</div>
        </div>
        <p className="hero-line">
          All <strong>{state.totals.districts} districts</strong>, <strong>{state.totals.chc} CHCs</strong>{" "}
          and <strong>{state.totals.phc.toLocaleString("en-IN")} PHCs</strong> of Gujarat&apos;s
          public health network are on the map. <strong>Dahod</strong> is live today — real facility
          reports flowing through the radar. Every other district lights up the day its PHCs start
          sending their 30-second report. This is how you cover a state: one block at a time.
        </p>
      </div>

      <div className="kpi-row">
        <div className="kpi accent">
          <div className="v">{state.totals.districts}</div>
          <div className="l">districts on the map</div>
        </div>
        <div className="kpi ok">
          <div className="v">{liveCount}</div>
          <div className="l">live pilot district (Dahod)</div>
        </div>
        <div className={`kpi ${dash.kpis.activeAlerts > 0 ? "danger" : "ok"}`}>
          <div className="v">{dash.kpis.activeAlerts}</div>
          <div className="l">live outbreak alerts in Dahod</div>
        </div>
        <div className="kpi accent">
          <div className="v">{inr(dash.kpis.expiryWasteValue)}</div>
          <div className="l">medicine expiry flagged in Dahod</div>
        </div>
        <div className="kpi">
          <div className="v">{state.totals.phc.toLocaleString("en-IN")}</div>
          <div className="l">PHCs statewide (NHM / Gujarat Health Dept)</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Gujarat — {state.totals.districts} districts</h2>
          <p className="sub">
            the live district glows; the rest are real facility networks awaiting onboarding · click
            Dahod to open its command centre
          </p>
          <StateMap
            center={state.center}
            districts={state.districts}
            liveStats={{ alerts: dash.kpis.activeAlerts, expiryValue: dash.kpis.expiryWasteValue }}
          />
        </div>

        <div className="dash-col">
          <div className="card state-spotlight">
            <span className="badge alert">● LIVE PILOT</span>
            <h2>Dahod district</h2>
            <p className="sub">
              {flagship?.chc ?? 12} CHCs and {flagship?.phc ?? 76} PHCs across 9 tribal blocks — a
              dengue-like outbreak is flaring in <strong>Jhalod</strong>, caught days before any
              weekly report, while dengue test kits worth lakhs sit expiring in the west.
            </p>
            <div className="spotlight-nums">
              <div>
                <div className="v danger">{dash.kpis.activeAlerts}</div>
                <div className="l">outbreak alerts</div>
              </div>
              <div>
                <div className="v warn">{dash.kpis.criticalLines}</div>
                <div className="l">stockout/critical lines</div>
              </div>
              <div>
                <div className="v accent">{inr(dash.kpis.expiryWasteValue)}</div>
                <div className="l">expiring unused</div>
              </div>
              <div>
                <div className="v danger">{dash.kpis.blindSpotCount}</div>
                <div className="l">blind spots in alert blocks</div>
              </div>
            </div>
            <Link className="btn" href={`/district/${state.flagship}`}>
              Open the Dahod command centre →
            </Link>
          </div>

          <div className="card">
            <h2>How a district goes live</h2>
            <ol className="steps">
              <li>
                A block&apos;s PHC staff send the day&apos;s numbers as a 30-second voice note or a
                photo of the paper register — in Gujarati, Hindi or English.
              </li>
              <li>Gemini turns it into a structured daily report; staff confirm in one tap.</li>
              <li>
                The radar starts watching that block for outbreaks, stockouts and expiry — no new
                hardware, no new register.
              </li>
            </ol>
            <p className="sub">
              Read-only augmentation of what facilities already do. It changes nothing they run — it
              only makes the paper they already fill in visible in time to act.
            </p>
          </div>
        </div>
      </div>

      <div className="card provenance">
        <p className="sub">{state.note}</p>
      </div>
    </div>
  );
}
