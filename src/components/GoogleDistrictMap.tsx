"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { FacilityStatus } from "@/lib/analytics";
import {
  type AlertZone,
  SEVERITY_COLOR,
  pinColor,
  facilityPopupHtml,
  MapLegend,
} from "./DistrictMap";

function pinScale(type: string): number {
  if (type === "DHH") return 9;
  if (type === "SDH") return 7.5;
  if (type === "CHC") return 6.5;
  return 5;
}

export default function GoogleDistrictMap({
  center,
  facilities,
  zones,
  apiKey,
}: {
  center: { lat: number; lng: number };
  facilities: FacilityStatus[];
  zones: AlertZone[];
  apiKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setOptions({ key: apiKey, v: "weekly" });

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = google.maps;
        const map = new g.Map(ref.current, {
          center,
          zoom: 9,
          scrollwheel: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        const bounds = new g.LatLngBounds();
        const info = new g.InfoWindow();

        for (const zone of zones) {
          const bf = facilities.filter((f) => f.block === zone.block);
          if (bf.length === 0) continue;
          const lat = bf.reduce((a, f) => a + f.lat, 0) / bf.length;
          const lng = bf.reduce((a, f) => a + f.lng, 0) / bf.length;
          new g.Circle({
            map,
            center: { lat, lng },
            radius: 10000,
            strokeColor: SEVERITY_COLOR[zone.severity],
            strokeOpacity: 0.9,
            strokeWeight: 1.5,
            fillColor: SEVERITY_COLOR[zone.severity],
            fillOpacity: 0.07,
          });
        }

        for (const f of facilities) {
          const silent = f.daysSinceReport >= 2;
          const marker = new g.Marker({
            map,
            position: { lat: f.lat, lng: f.lng },
            title: f.name,
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: pinScale(f.type),
              fillColor: silent ? "#ffffff" : pinColor(f),
              fillOpacity: silent ? 0.5 : 0.95,
              strokeColor: silent ? "#64748b" : "#ffffff",
              strokeWeight: silent ? 2 : 1.5,
            },
          });
          marker.addListener("click", () => {
            info.setContent(facilityPopupHtml(f));
            info.open({ map, anchor: marker });
          });
          bounds.extend({ lat: f.lat, lng: f.lng });
        }

        map.fitBounds(bounds, 40);
      })
      .catch((e: unknown) => console.error("Google Maps failed to load:", e));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={ref} className="map-wrap" />
      <MapLegend />
    </div>
  );
}
