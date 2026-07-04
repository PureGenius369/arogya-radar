import Link from "next/link";
import { getStore } from "@/lib/store";
import { buildDashboard } from "@/lib/analytics";
import DistrictMap from "@/components/DistrictMap";
import BriefPanel from "@/components/BriefPanel";
import Sparkline from "@/components/Sparkline";
import DemoTour from "@/components/DemoTour";

export const dynamic = "force-dynamic";

function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

const REASON_LABEL: Record<string, string> = {
  "stockout-relief": "stockout relief",
  "expiry-prevention": "expiry prevention",
  "outbreak-preposition": "outbreak pre-positioning",
};
const REASON_CLASS: Record<string, string> = {
  "stockout-relief": "critical",
  "expiry-prevention": "surplus",
  "outbreak-preposition": "alert",
};

export default function CommandCentre() {
  const dash = buildDashboard(getStore());
  const zones = dash.alerts
    .filter((a) => a.severity !== "watch")
    .map((a) => ({ block: a.block, severity: a.severity, label: a.label }));

  return (
    <div>
      <DemoTour />
      <div className="page-head">
        <h1>District command centre</h1>
        <span className="asof">
          {dash.district} district, {dash.state} · data as of {dash.endDate} ·{" "}
          <Link href="/intake">submit a facility report →</Link>
        </span>
      </div>

      <div className="kpi-row">
        <div className={`kpi ${dash.kpis.activeAlerts > 0 ? "danger" : "ok"}`}>
          <div className="v">{dash.kpis.activeAlerts}</div>
          <div className="l">active outbreak alerts</div>
        </div>
        <div className={`kpi ${dash.kpis.criticalLines > 0 ? "warn" : "ok"}`}>
          <div className="v">{dash.kpis.criticalLines}</div>
          <div className="l">medicine lines at stockout/critical</div>
        </div>
        <div className="kpi accent">
          <div className="v">{inr(dash.kpis.expiryWasteValue)}</div>
          <div className="l">medicines expiring unused (120 days)</div>
        </div>
        <div className={`kpi ${dash.kpis.reportingRate >= 85 ? "ok" : "warn"}`}>
          <div className="v">{dash.kpis.reportingRate}%</div>
          <div className="l">facilities reported today</div>
        </div>
        <div className={`kpi ${dash.kpis.blindSpotCount > 0 ? "danger" : "ok"}`}>
          <div className="v">{dash.kpis.blindSpotCount}</div>
          <div className="l">reporting blind spots in alert blocks</div>
        </div>
        <div className={`kpi ${dash.kpis.bedsUnderPressure > 0 ? "warn" : "ok"}`}>
          <div className="v">{dash.kpis.bedsUnderPressure}</div>
          <div className="l">facilities ≥90% bed occupancy</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="dash-col">
          <div className="card">
            <h2>District map</h2>
            <p className="sub">
              36 facilities · dashed circles mark blocks with an active outbreak signal · click a
              pin for details
            </p>
            <DistrictMap center={dash.center} facilities={dash.facilities} zones={zones} />
          </div>

          <div className="card">
            <h2>Stock emergencies</h2>
            <p className="sub">days of stock = on-hand ÷ 14-day burn rate · target 30 days</p>
            <table className="data">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Medicine</th>
                  <th style={{ textAlign: "right" }}>On hand</th>
                  <th style={{ textAlign: "right" }}>Days left</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dash.shortages.map((s, i) => (
                  <tr key={i}>
                    <td>{s.facilityName}</td>
                    <td>{s.drugName}</td>
                    <td className="num">
                      {s.stock} {s.unit}
                    </td>
                    <td className="num">{s.daysOfStock}</td>
                    <td>
                      <span className={`badge ${s.status}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Expiring unused — {inr(dash.expiryTotal)} at risk</h2>
            <p className="sub">
              batches that will not be consumed before expiry at current burn rate (FEFO)
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Medicine</th>
                  <th style={{ textAlign: "right" }}>Will expire</th>
                  <th>Expiry</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {dash.expiry.map((e, i) => (
                  <tr key={i}>
                    <td>{e.facilityName}</td>
                    <td>{e.drugName}</td>
                    <td className="num">
                      {e.expectedWasteUnits} {e.unit}
                    </td>
                    <td>{e.expiry}</td>
                    <td className="num money">{inr(e.wasteValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card radar-card">
          <h2>Outbreak radar</h2>
          <p className="sub">
            EARS-C2 aberration detection over daily syndrome counts, block-level corroboration —
            the same statistics family used by CDC/WHO surveillance, running on facility reports.
          </p>
          {dash.alerts.length === 0 && <p>No abnormal syndrome activity detected.</p>}
          {dash.alerts.map((a) => (
            <div key={a.id} className={`alert-item ${a.severity}`}>
              <div className="head">
                <span className="title">
                  {a.block} block — {a.label}
                </span>
                <span className={`badge ${a.severity}`}>{a.severity}</span>
              </div>
              <div className="msg">{a.message}</div>
              {a.facilities.slice(0, 4).map((f) => (
                <div key={f.facilityId} className="alert-fac">
                  <span>{f.facilityName}</span>
                  <Sparkline data={f.spark} stroke={a.severity === "alert" ? "#dc2626" : "#d97706"} />
                  <span className="z">
                    {f.today} vs {f.baselineMean} (z={f.zscore})
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>
          Reporting compliance —{" "}
          {dash.kpis.silentCount === 0 ? (
            "every centre reported"
          ) : (
            <>
              {dash.kpis.silentCount} centre{dash.kpis.silentCount > 1 ? "s" : ""} silent,{" "}
              {dash.kpis.blindSpotCount} blind spot{dash.kpis.blindSpotCount === 1 ? "" : "s"}
            </>
          )}
        </h2>
        <p className="sub">
          a centre that stops reporting is a blind spot — one inside a block that is flagging an
          outbreak is the most dangerous of all. Every report is attributed, so the district knows
          exactly who to call.
        </p>
        {dash.compliance.filter((c) => c.severity !== "ok").length === 0 ? (
          <p>All 36 facilities are reporting on time.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Block</th>
                <th style={{ textAlign: "right" }}>Silent</th>
                <th>Status</th>
                <th>Last reported by — call to follow up</th>
              </tr>
            </thead>
            <tbody>
              {dash.compliance
                .filter((c) => c.severity !== "ok")
                .map((c) => (
                  <tr key={c.facilityId}>
                    <td>{c.facilityName}</td>
                    <td>{c.block}</td>
                    <td className="num">{c.daysSinceReport} days</td>
                    <td>
                      <span className={`badge ${c.severity}`}>
                        {c.severity === "blindspot" ? "blind spot" : "overdue"}
                      </span>
                    </td>
                    <td>
                      {c.lastReporter ? (
                        <>
                          {c.lastReporter.name} · {c.lastReporter.role}{" "}
                          <span style={{ color: "var(--ink-3)" }}>({c.lastReporter.staffId})</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Recommended transfers</h2>
        <p className="sub">
          greedy matching: worst shortages first, nearest surplus holder — expiring stock offered
          before fresh stock, outbreak blocks pre-positioned to 21 days of cover
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>Medicine</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th>From</th>
              <th>To</th>
              <th style={{ textAlign: "right" }}>Distance</th>
              <th>Why</th>
              <th style={{ textAlign: "right" }}>Waste prevented</th>
            </tr>
          </thead>
          <tbody>
            {dash.transfers.map((t, i) => (
              <tr key={i}>
                <td>{t.drugName}</td>
                <td className="num">
                  {t.qty} {t.unit}
                </td>
                <td>{t.fromName}</td>
                <td>{t.toName}</td>
                <td className="num">{t.km} km</td>
                <td>
                  <span className={`badge ${REASON_CLASS[t.reason]}`}>{REASON_LABEL[t.reason]}</span>
                </td>
                <td className="num money">{t.valueSaved > 0 ? inr(t.valueSaved) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Weekly brief for the Collector &amp; CDMO</h2>
        <BriefPanel />
      </div>

      {dash.intakeLog.length > 0 && (
        <div className="card">
          <h2>Recent facility reports (this session)</h2>
          <table className="data">
            <thead>
              <tr>
                <th>Time</th>
                <th>Facility</th>
                <th>Reported by</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {dash.intakeLog.map((l, i) => (
                <tr key={i}>
                  <td>{new Date(l.at).toLocaleTimeString()}</td>
                  <td>{l.facilityId}</td>
                  <td>{l.reporter?.name ? `${l.reporter.name} (${l.reporter.role})` : "—"}</td>
                  <td>{l.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
