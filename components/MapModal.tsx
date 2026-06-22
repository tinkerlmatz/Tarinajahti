"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

export default function MapModal({
  boundary,
  playerPos = null,
  title,
  onClose,
}: {
  boundary: unknown | null;
  playerPos?: LatLng | null;
  title: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      try {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      // Korjaa Leafletin oletusmarkkeri-ikonit (bundler ei löydä niitä muuten).
      delete (
        L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown }
      )._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });

      map = L.map(containerRef.current, { attributionControl: true });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      let bounds: import("leaflet").LatLngBounds | null = null;

      if (boundary) {
        const layer = L.geoJSON(boundary as GeoJSON.GeoJsonObject, {
          style: {
            color: "#1E3A5F",
            weight: 3,
            fillColor: "#1E3A5F",
            fillOpacity: 0.12,
          },
        }).addTo(map);
        bounds = layer.getBounds();
      }

      if (playerPos) {
        const marker = L.circleMarker([playerPos.lat, playerPos.lng], {
          radius: 8,
          color: "#0D1B2A",
          weight: 2,
          fillColor: "#F4B942",
          fillOpacity: 1,
        }).addTo(map);
        marker.bindPopup("Sinä olet tässä");
      }

      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else if (playerPos) {
        map.setView([playerPos.lat, playerPos.lng], 15);
      } else {
        map.setView([65.0, 25.54], 12);
      }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [boundary, playerPos]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 className="font-bold text-cream">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Sulje kartta"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean/60 text-lg text-cream transition-colors hover:bg-ocean"
        >
          ✕
        </button>
      </div>
      {error && (
        <div className="border-b border-red-800 bg-red-950 p-3 text-xs text-red-300">
          Karttavirhe: {error}
        </div>
      )}
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }} />
    </div>
  );
}
