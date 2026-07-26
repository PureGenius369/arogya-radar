"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap } from "leaflet";
import type { DistrictSummary } from "@/lib/types";

export interface StateMapProps {
  center: { lat: number; lng: number };
  districts: DistrictSummary[];
  /** Headline stats for the live district, shown in its popup. */
  liveStats?: { alerts: number; expiryValue: number };
}

function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export default function StateMap({ center, districts, liveStats }: StateMapProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !divRef.current || mapRef.current) return;

      const map = L.map(divRef.current, { scrollWheelZoom: false }).setView(
        [center.lat, center.lng],
        7
      );
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      for (const d of districts) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="state-pin ${d.live ? "live" : "dark"}"><span class="dot"></span>${
            d.live ? `<span class="label">${d.name} · LIVE</span>` : ""
          }</div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const marker = L.marker([d.lat, d.lng], { icon, title: d.name }).addTo(map);

        if (d.live) {
          const stats = liveStats
            ? `<br/>${liveStats.alerts} active outbreak alert${liveStats.alerts === 1 ? "" : "s"} · ${inr(
                liveStats.expiryValue
              )} expiring`
            : "";
          marker.bindPopup(
            `<strong>${d.name} district</strong> <span style="color:#16a34a;font-weight:700">● LIVE</span>` +
              `<br/>${d.chc ?? ""} CHCs · ${d.phc ?? ""} PHCs reporting through the radar${stats}` +
              `<br/><a href="/district/${d.id}" style="color:#0e7490;font-weight:600">Open live dashboard →</a>`
          );
          marker.on("click", () => router.push(`/district/${d.id}`));
        } else {
          marker.bindTooltip(`${d.name} — not yet onboarded`, { direction: "top" });
        }
      }

      map.fitBounds(
        L.latLngBounds(districts.map((d) => [d.lat, d.lng] as [number, number])).pad(0.1)
      );
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
      <div ref={divRef} className="map-wrap state-map" />
      <div className="map-legend">
        <span>
          <span className="dot" style={{ background: "#dc2626" }} /> live pilot district
        </span>
        <span>
          <span className="dot" style={{ background: "#94a3b8" }} /> awaiting onboarding
        </span>
        <span>click the live district to open its command centre</span>
      </div>
    </div>
  );
}
