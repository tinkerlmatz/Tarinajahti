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
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  // Uusin pelaajasijainti init-efektin alkukeskitystä varten (ilman dep:iä).
  const playerPosRef = useRef(playerPos);
  playerPosRef.current = playerPos;
  const [error, setError] = useState<string | null>(null);

  // --- Kartan alustus: AINOASTAAN kerran (boundary ei muutu session aikana).
  // playerPos EI ole riippuvuutena → kartta ei rakennu uudelleen GPS-päivityksistä.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;

        // Korjaa Leafletin oletusmarkkeri-ikonit (bundler ei löydä niitä muuten).
        delete (
          L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown }
        )._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "/leaflet/marker-icon-2x.png",
          iconUrl: "/leaflet/marker-icon.png",
          shadowUrl: "/leaflet/marker-shadow.png",
        });

        const map = L.map(containerRef.current, { attributionControl: true });
        mapRef.current = map;
        // Aseta oletusnäkymä heti, jotta kartalla on koko/zoom ennen fitBounds.
        map.setView([65.0, 25.54], 12);

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

        // Varmista oikea koko ennen rajaukseen sovittamista.
        map.invalidateSize();
        const pp = playerPosRef.current;
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        } else if (pp) {
          map.setView([pp.lat, pp.lng], 15);
        }

        // Pelaajamerkki (jos sijainti jo tiedossa). Päivitykset hoitaa toinen efekti.
        if (pp) {
          const marker = L.circleMarker([pp.lat, pp.lng], {
            radius: 8,
            color: "#0D1B2A",
            weight: 2,
            fillColor: "#F4B942",
            fillOpacity: 1,
          }).addTo(map);
          marker.bindPopup("Sinä olet tässä");
          markerRef.current = marker;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [boundary]);

  // --- Pelaajamerkin päivitys: siirrä olemassa olevaa markeria (ei karttaa
  // uudelleen). Luo merkki jos kartta ehti valmistua ennen ensimmäistä sijaintia.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !playerPos) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([playerPos.lat, playerPos.lng]);
    } else {
      const marker = L.circleMarker([playerPos.lat, playerPos.lng], {
        radius: 8,
        color: "#0D1B2A",
        weight: 2,
        fillColor: "#F4B942",
        fillOpacity: 1,
      }).addTo(map);
      marker.bindPopup("Sinä olet tässä");
      markerRef.current = marker;
    }
  }, [playerPos]);

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
          Kartan lataus epäonnistui. Yritä uudelleen.
        </div>
      )}
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }} />
    </div>
  );
}
