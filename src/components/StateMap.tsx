"use client";

import type { DistrictSummary } from "@/lib/types";
import LeafletStateMap from "./LeafletStateMap";
import GoogleStateMap from "./GoogleStateMap";

export interface StateMapCoreProps {
  center: { lat: number; lng: number };
  districts: DistrictSummary[];
  /** Headline stats for the live district, shown in its popup. */
  liveStats?: { alerts: number; expiryValue: number };
}
export interface StateMapProps extends StateMapCoreProps {
  /** Passed from the server (runtime env) so Cloud Run can set it at deploy. */
  mapsApiKey?: string;
}

export function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function StateMapLegend() {
  return (
    <div className="map-legend">
      <span>
        <span className="dot" style={{ background: "#dc2626" }} /> live pilot district
      </span>
      <span>
        <span className="dot" style={{ background: "#94a3b8" }} /> awaiting onboarding
      </span>
      <span>click the live district to open its command centre</span>
    </div>
  );
}

// Uses Google Maps when a key is configured; otherwise falls back to
// OpenStreetMap/Leaflet so the landing map always works.
export default function StateMap({ mapsApiKey, ...rest }: StateMapProps) {
  if (mapsApiKey && mapsApiKey.length > 10) return <GoogleStateMap {...rest} apiKey={mapsApiKey} />;
  return <LeafletStateMap {...rest} />;
}
