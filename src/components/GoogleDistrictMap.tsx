"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { FacilityStatus } from "@/lib/analytics";
import type { TransferRec } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
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
  transfers = [],
  apiKey,
}: {
  center: { lat: number; lng: number };
  facilities: FacilityStatus[];
  zones: AlertZone[];
  transfers?: TransferRec[];
  apiKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const heatRef = useRef<google.maps.Circle[] | null>(null);
  const routeRef = useRef<google.maps.DirectionsRenderer | google.maps.Polyline | null>(null);
  const facById = useRef(new Map<string, FacilityStatus>());
  const [ready, setReady] = useState(false);
  const [heatOn, setHeatOn] = useState(false);
  const [routeIdx, setRouteIdx] = useState(-1);
  const [routeInfo, setRouteInfo] = useState("");

  // Build the map once.
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
        mapRef.current = map;
        for (const f of facilities) facById.current.set(f.id, f);

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
        setReady(true);
      })
      .catch((e: unknown) => console.error("Google Maps failed to load:", e));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outbreak case-intensity heatmap: translucent red circles sized and shaded
  // by today's case load, overlapping into density blobs. (The native
  // HeatmapLayer was deprecated/removed by Google.)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = google.maps;
    if (heatOn) {
      if (!heatRef.current) {
        heatRef.current = facilities
          .filter((f) => f.caseLoad > 0)
          .map(
            (f) =>
              new g.Circle({
                map,
                center: { lat: f.lat, lng: f.lng },
                radius: 2500 + f.caseLoad * 350,
                strokeWeight: 0,
                fillColor: "#e24b4a",
                fillOpacity: Math.min(0.45, 0.06 + f.caseLoad * 0.012),
                clickable: false,
                zIndex: 1,
              })
          );
      } else {
        heatRef.current.forEach((c) => c.setMap(map));
      }
    } else if (heatRef.current) {
      heatRef.current.forEach((c) => c.setMap(null));
    }
  }, [heatOn, ready, facilities]);

  // Draw the road route for the selected transfer (fallback: straight line).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    if (routeRef.current) {
      routeRef.current.setMap(null);
      routeRef.current = null;
    }
    setRouteInfo("");
    const t = routeIdx >= 0 ? transfers[routeIdx] : undefined;
    if (!t) return;
    const from = facById.current.get(t.fromId);
    const to = facById.current.get(t.toId);
    if (!from || !to) return;

    const g = google.maps;
    let cancelled = false;

    const straightLine = (note: string) => {
      if (cancelled) return;
      const line = new g.Polyline({
        map,
        path: [
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng },
        ],
        geodesic: true,
        strokeColor: "#0e7490",
        strokeOpacity: 0.85,
        strokeWeight: 4,
      });
      routeRef.current = line;
      const km = Math.round(haversineKm(from.lat, from.lng, to.lat, to.lng));
      setRouteInfo(`${t.drugName}: ${from.name} → ${to.name} · ${km} km ${note}`);
    };

    (async () => {
      try {
        const routes = await importLibrary("routes");
        const svc = new routes.DirectionsService();
        const res = await svc.route({
          origin: { lat: from.lat, lng: from.lng },
          destination: { lat: to.lat, lng: to.lng },
          travelMode: g.TravelMode.DRIVING,
        });
        if (cancelled) return;
        const rend = new routes.DirectionsRenderer({
          map,
          directions: res,
          suppressMarkers: true,
          polylineOptions: { strokeColor: "#0e7490", strokeWeight: 5, strokeOpacity: 0.9 },
        });
        routeRef.current = rend;
        const leg = res.routes[0]?.legs[0];
        setRouteInfo(
          `${t.drugName}: ${from.name} → ${to.name} · ${leg?.distance?.text ?? ""} by road · ${leg?.duration?.text ?? ""}`
        );
      } catch {
        straightLine("(straight line — enable the Directions API for the road route)");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeIdx, ready, transfers]);

  return (
    <div>
      <div ref={ref} className="map-wrap" />
      <div className="map-controls">
        <label className="map-toggle">
          <input type="checkbox" checked={heatOn} onChange={(e) => setHeatOn(e.target.checked)} />{" "}
          Outbreak heatmap
        </label>
        <select value={routeIdx} onChange={(e) => setRouteIdx(Number(e.target.value))}>
          <option value={-1}>Draw a transfer&apos;s road route…</option>
          {transfers.map((t, i) => (
            <option key={i} value={i}>
              {t.drugName}: {t.fromName} → {t.toName}
            </option>
          ))}
        </select>
        {routeInfo && <span className="route-info">{routeInfo}</span>}
      </div>
      <MapLegend />
    </div>
  );
}
