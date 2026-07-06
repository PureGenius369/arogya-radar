"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import {
  type DistrictMapProps,
  SEVERITY_COLOR,
  pinColor,
  facilityPopupHtml,
  MapLegend,
} from "./DistrictMap";

function pinRadius(type: string): number {
  if (type === "DHH") return 11;
  if (type === "SDH") return 9;
  if (type === "CHC") return 8;
  return 6;
}

export default function LeafletDistrictMap({ center, facilities, zones }: DistrictMapProps) {
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
        const silent = f.daysSinceReport >= 2;
        L.circleMarker([f.lat, f.lng], {
          radius: pinRadius(f.type),
          color: silent ? "#64748b" : "#ffffff",
          weight: silent ? 2 : 1.5,
          fillColor: silent ? "#ffffff" : pinColor(f),
          fillOpacity: silent ? 0.35 : 0.95,
          dashArray: silent ? "3 2" : undefined,
        })
          .addTo(map)
          .bindPopup(facilityPopupHtml(f));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={divRef} className="map-wrap" />
      <MapLegend />
    </div>
  );
}
