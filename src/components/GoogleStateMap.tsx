"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { type StateMapCoreProps, StateMapLegend, inr } from "./StateMap";
import LeafletStateMap from "./LeafletStateMap";

export default function GoogleStateMap({
  center,
  districts,
  liveStats,
  apiKey,
}: StateMapCoreProps & { apiKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // If Google Maps can't render (billing off, API not enabled, key restricted),
  // fall back to the OpenStreetMap/Leaflet map so the landing page is never blank.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const w = window as unknown as { gm_authFailure?: () => void };
    w.gm_authFailure = () => setFailed(true);
    const timer = setTimeout(() => setFailed(true), 6000); // no tiles by now → fall back

    setOptions({ key: apiKey, v: "weekly" });

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = google.maps;
        const map = new g.Map(ref.current, {
          center,
          zoom: 7,
          scrollwheel: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        map.addListener("tilesloaded", () => clearTimeout(timer));

        const bounds = new g.LatLngBounds();
        const info = new g.InfoWindow();

        for (const d of districts) {
          const marker = new g.Marker({
            map,
            position: { lat: d.lat, lng: d.lng },
            title: d.live ? `${d.name} — LIVE` : `${d.name} — not yet onboarded`,
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: d.live ? 9 : 5,
              fillColor: d.live ? "#dc2626" : "#94a3b8",
              fillOpacity: d.live ? 1 : 0.8,
              strokeColor: "#ffffff",
              strokeWeight: d.live ? 2 : 1,
            },
            zIndex: d.live ? 999 : 1,
          });

          marker.addListener("click", () => router.push(`/district/${d.id}`));
          bounds.extend({ lat: d.lat, lng: d.lng });

          if (d.live) {
            new g.Circle({
              map,
              center: { lat: d.lat, lng: d.lng },
              radius: 24000,
              strokeColor: "#dc2626",
              strokeOpacity: 0.5,
              strokeWeight: 1,
              fillColor: "#dc2626",
              fillOpacity: 0.12,
              clickable: false,
            });
            const stats = liveStats
              ? `<br/>${liveStats.alerts} active outbreak alert${liveStats.alerts === 1 ? "" : "s"} · ${inr(
                  liveStats.expiryValue
                )} expiring`
              : "";
            info.setContent(
              `<div style="font-size:13px;line-height:1.5"><strong>${d.name} district</strong> ` +
                `<span style="color:#16a34a;font-weight:700">● LIVE</span>` +
                `<br/>${d.chc ?? ""} CHCs · ${d.phc ?? ""} PHCs reporting through the radar${stats}` +
                `<br/><a href="/district/${d.id}" style="color:#0e7490;font-weight:600">Open live dashboard →</a></div>`
            );
            info.open({ map, anchor: marker });
          }
        }

        map.fitBounds(bounds, 48);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return <LeafletStateMap center={center} districts={districts} liveStats={liveStats} />;
  }

  return (
    <div>
      <div ref={ref} className="map-wrap state-map" />
      <StateMapLegend />
    </div>
  );
}
