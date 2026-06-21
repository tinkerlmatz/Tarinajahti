"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

export default function MapPicker({
  boundary,
  value,
  onPick,
}: {
  boundary: unknown | null;
  value: LatLng | null;
  onPick: (p: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Alusta kartta kerran.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { attributionControl: true });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      if (boundary) {
        const layer = L.geoJSON(boundary as GeoJSON.GeoJsonObject, {
          style: {
            color: "#F4B942",
            weight: 3,
            fillColor: "#F4B942",
            fillOpacity: 0.1,
          },
        }).addTo(map);
        const b = layer.getBounds();
        if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
      } else {
        map.setView([65.0, 25.54], 12);
      }

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [boundary]);

  // Päivitä merkki valitun sijainnin mukaan.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;
      if (!value) {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        return;
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else {
        markerRef.current = L.circleMarker([value.lat, value.lng], {
          radius: 8,
          color: "#0D1B2A",
          weight: 2,
          fillColor: "#F4B942",
          fillOpacity: 1,
        }).addTo(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-xl border border-white/10"
    />
  );
}
