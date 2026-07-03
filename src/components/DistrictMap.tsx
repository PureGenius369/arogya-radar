"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { FacilityStatus } from "@/lib/analytics";

export interface AlertZone {
  block: string;
  severity: "watch" | "warning" | "alert";
  label: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  alert: "#dc2626",
  warning: "#d97706",
  watch: "#a16207",
};

function pinColor(f: FacilityStatus): string {
  if (f.alertLevel) return SEVERITY_COLOR[f.alertLevel];
  if (f.worstStock === "stockout" || f.worstStock === "critical") return "#6d28d9";
  return "#0e7490";
}

function pinRadius(type: string): number {
  if (type === "DHH") return 11;
  if (type === "SDH") return 9;
  if (type === "CHC") return 8;
  return 6;
}

export default function DistrictMap({
  center,
  facilities,
  zones,
}: {
  center: { lat: number; lng: number };
  facilities: FacilityStatus[];
  zones: AlertZone[];
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !divRef.current || mapRef.current) return;

      const map = L.map(divRef.current, { scrollWheelZoom: false }).setView(
        [center.lat, center.lng],
        9
      );
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Alert zones: dashed circles around the centroid of each alerted block.
      for (const zone of zones) {
        const blockFacs = facilities.filter((f) => f.block === zone.block);
        if (blockFacs.length === 0) continue;
        const lat = blockFacs.reduce((a, f) => a + f.lat, 0) / blockFacs.length;
        const lng = blockFacs.reduce((a, f) => a + f.lng, 0) / blockFacs.length;
        L.circle([lat, lng], {
          radius: 10000,
          color: SEVERITY_COLOR[zone.severity],
          weight: 1.5,
          dashArray: "6 6",
          fillColor: SEVERITY_COLOR[zone.severity],
          fillOpacity: 0.06,
        })
          .addTo(map)
          .bindTooltip(`${zone.block}: ${zone.label}`, { direction: "top" });
      }

      for (const f of facilities) {
        const occ = f.beds > 0 ? Math.round((f.bedOccupied / f.beds) * 100) : 0;
        const marker = L.circleMarker([f.lat, f.lng], {
          radius: pinRadius(f.type),
          color: "#ffffff",
          weight: 1.5,
          fillColor: pinColor(f),
          fillOpacity: 0.95,
        }).addTo(map);
        marker.bindPopup(
          `<strong>${f.name}</strong><br/>${f.type} · ${f.block} block<br/>` +
            `OPD today: ${f.footfallToday}<br/>` +
            `Beds: ${f.bedOccupied}/${f.beds} (${occ}%)<br/>` +
            `Critical medicine lines: ${f.criticalDrugs}<br/>` +
            (f.alertLevel ? `<span style="color:#dc2626;font-weight:600">Outbreak ${f.alertLevel}</span><br/>` : "") +
            (f.reportedToday ? "Reported today" : "<em>No report today</em>")
        );
      }

      const bounds = L.latLngBounds(facilities.map((f) => [f.lat, f.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.12));
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // The dashboard passes fresh props on every server render; the map is
    // rebuilt only on mount, which is fine for this snapshot view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={divRef} className="map-wrap" />
      <div className="map-legend">
        <span><span className="dot" style={{ background: "#dc2626" }} /> outbreak alert</span>
        <span><span className="dot" style={{ background: "#d97706" }} /> outbreak warning</span>
        <span><span className="dot" style={{ background: "#6d28d9" }} /> stock critical</span>
        <span><span className="dot" style={{ background: "#0e7490" }} /> normal</span>
        <span>circle size = facility level (PHC → DHH)</span>
      </div>
    </div>
  );
}
