"use client";

import type { FacilityStatus } from "@/lib/analytics";
import type { TransferRec } from "@/lib/types";
import LeafletDistrictMap from "./LeafletDistrictMap";
import GoogleDistrictMap from "./GoogleDistrictMap";

export interface AlertZone {
  block: string;
  severity: "watch" | "warning" | "alert";
  label: string;
}

export interface DistrictMapProps {
  center: { lat: number; lng: number };
  facilities: FacilityStatus[];
  zones: AlertZone[];
  /** Transfer recommendations, for drawing road routes (Google Maps only). */
  transfers?: TransferRec[];
  /** Passed from the server (runtime env) so Cloud Run can set it at deploy. */
  mapsApiKey?: string;
}

export const SEVERITY_COLOR: Record<string, string> = {
  alert: "#dc2626",
  warning: "#d97706",
  watch: "#a16207",
};

export function pinColor(f: FacilityStatus): string {
  if (f.alertLevel) return SEVERITY_COLOR[f.alertLevel];
  if (f.worstStock === "stockout" || f.worstStock === "critical") return "#6d28d9";
  return "#0e7490";
}

/** Popup / info-window HTML, shared by both map backends. */
export function facilityPopupHtml(f: FacilityStatus): string {
  const occ = f.beds > 0 ? Math.round((f.bedOccupied / f.beds) * 100) : 0;
  const silent = f.daysSinceReport >= 2;
  const reporter = f.lastReporter
    ? `${f.lastReporter.name}, ${f.lastReporter.role} (${f.lastReporter.staffId})`
    : "—";
  const reportLine = f.reportedToday
    ? `Reported today · ${reporter}`
    : `<span style="color:${silent ? "#dc2626" : "#b45309"};font-weight:600">No report for ${f.daysSinceReport} day${f.daysSinceReport === 1 ? "" : "s"}</span><br/>Last: ${reporter}`;
  return (
    `<strong>${f.name}</strong><br/>${f.type} · ${f.block} block<br/>` +
    `OPD today: ${f.footfallToday}<br/>` +
    `Beds: ${f.bedOccupied}/${f.beds} (${occ}%)<br/>` +
    `Critical medicine lines: ${f.criticalDrugs}<br/>` +
    (f.alertLevel ? `<span style="color:#dc2626;font-weight:600">Outbreak ${f.alertLevel}</span><br/>` : "") +
    reportLine
  );
}

export function MapLegend() {
  return (
    <div className="map-legend">
      <span><span className="dot" style={{ background: "#dc2626" }} /> outbreak alert</span>
      <span><span className="dot" style={{ background: "#d97706" }} /> outbreak warning</span>
      <span><span className="dot" style={{ background: "#6d28d9" }} /> stock critical</span>
      <span><span className="dot" style={{ background: "#0e7490" }} /> normal</span>
      <span>
        <span className="dot" style={{ background: "#fff", border: "2px dashed #64748b" }} /> silent
        (no report)
      </span>
      <span>circle size = facility level (PHC → DHH)</span>
    </div>
  );
}

// Uses Google Maps when a key is configured; otherwise falls back to
// OpenStreetMap/Leaflet so the app always has a working map.
export default function DistrictMap({ mapsApiKey, ...rest }: DistrictMapProps) {
  if (mapsApiKey && mapsApiKey.length > 10) return <GoogleDistrictMap {...rest} apiKey={mapsApiKey} />;
  return <LeafletDistrictMap {...rest} />;
}
