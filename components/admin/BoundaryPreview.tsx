"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function BoundaryPreview({ boundary }: { boundary: unknown }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      const layer = L.geoJSON(boundary as GeoJSON.GeoJsonObject, {
        style: {
          color: "#1E3A5F",
          weight: 3,
          fillColor: "#1E3A5F",
          fillOpacity: 0.12,
        },
      }).addTo(map);
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    })();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [boundary]);

  return (
    <div
      ref={ref}
      className="h-56 w-full overflow-hidden rounded-xl border border-white/10"
    />
  );
}
