"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  haversineDistance,
  bearing,
  directionLabel,
  formatDistance,
} from "@/lib/geo";
import type { GameBoard, Story } from "@/types/database";
import BottomNav from "@/components/BottomNav";
import StoryModal from "@/components/play/StoryModal";
import MapModal from "@/components/MapModal";

const HINT_RADIUS_M = 100; // ohikulkuvihje
const DEFAULT_DISCOVERY_M = 15; // tarinan avautuminen
const FLUSH_INTERVAL_MS = 30000; // matkan kirjaus kantaan max 1x / 30s

type Pos = { lat: number; lng: number };

export default function PlayView({
  board,
  stories,
  discoveredIds,
  userId,
  baseXp,
  baseWalk,
  baseCycle,
}: {
  board: GameBoard;
  stories: Story[];
  discoveredIds: string[];
  userId: string;
  baseXp: number;
  baseWalk: number;
  baseCycle: number;
}) {
  const supabase = createClient();

  const [pos, setPos] = useState<Pos | null>(null);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(
    () => new Set(discoveredIds)
  );
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Kirjautumattomat akkumulaattorit (ei aiheuta uudelleenrenderöintiä).
  const prevPos = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const accWalk = useRef(0);
  const accCycle = useRef(0);
  const accXp = useRef(0);
  const lastFlush = useRef(0);
  const discoveredRef = useRef<Set<string>>(new Set(discoveredIds));

  // --- Matkan kirjaaminen kantaan (throttlattu) ---
  const flushDistance = useCallback(async () => {
    lastFlush.current = Date.now();
    await supabase
      .from("profiles")
      .update({
        distance_walked_meters: Math.round(baseWalk + accWalk.current),
        distance_cycled_meters: Math.round(baseCycle + accCycle.current),
      })
      .eq("id", userId);
  }, [supabase, userId, baseWalk, baseCycle]);

  // --- Löytötarkistus ---
  const checkDiscovery = useCallback(
    async (p: Pos) => {
      for (const story of stories) {
        if (discoveredRef.current.has(story.id)) continue;
        const dist = haversineDistance(p.lat, p.lng, story.lat, story.lng);
        const radius = story.discovery_radius_meters || DEFAULT_DISCOVERY_M;
        if (dist <= radius) {
          discoveredRef.current.add(story.id);
          setDiscovered(new Set(discoveredRef.current));
          accXp.current += story.xp_reward;
          setActiveStory(story);

          await supabase.from("discovered_stories").insert({
            user_id: userId,
            story_id: story.id,
          });
          await supabase
            .from("profiles")
            .update({ total_xp: baseXp + accXp.current })
            .eq("id", userId);
          break; // yksi kerrallaan
        }
      }
    },
    [stories, supabase, userId, baseXp]
  );

  // --- Sijainnin päivitys: etäisyys, nopeus, löydöt ---
  const onPosition = useCallback(
    (coords: GeolocationCoordinates) => {
      const p = { lat: coords.latitude, lng: coords.longitude };
      setPos(p);
      setError(null);

      const now = Date.now();
      const prev = prevPos.current;
      if (prev) {
        const d = haversineDistance(prev.lat, prev.lng, p.lat, p.lng);
        const dtSec = (now - prev.t) / 1000;
        if (dtSec > 0 && d >= 1) {
          const speedKmh = (d / dtSec) * 3.6;
          if (speedKmh <= 6) accWalk.current += d;
          else if (speedKmh <= 25) accCycle.current += d;
          // yli 25 km/h → ei kirjata
        }
      }
      prevPos.current = { lat: p.lat, lng: p.lng, t: now };

      void checkDiscovery(p);

      if (now - lastFlush.current >= FLUSH_INTERVAL_MS) {
        void flushDistance();
      }
    },
    [checkDiscovery, flushDistance]
  );

  // --- Geolocation watch ---
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Laitteesi ei tue paikannusta.");
      return;
    }
    const id = navigator.geolocation.watchPosition((p) => onPosition(p.coords), (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError("Salli sijaintitietosi, jotta voit löytää tarinoita.");
      } else {
        setError("Paikannus epäonnistui. Yritä ulkona avoimella alueella.");
      }
    }, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 20000,
    });
    return () => {
      navigator.geolocation.clearWatch(id);
      // Tallenna viimeiset matkat poistuttaessa.
      void flushDistance();
    };
  }, [onPosition, flushDistance]);

  // --- Laitteen kompassisuunta (best-effort) ---
  useEffect(() => {
    function handle(e: DeviceOrientationEvent & { webkitCompassHeading?: number }) {
      if (typeof e.webkitCompassHeading === "number") {
        setHeading(e.webkitCompassHeading);
      } else if (e.absolute && typeof e.alpha === "number") {
        setHeading(360 - e.alpha);
      }
    }
    window.addEventListener("deviceorientationabsolute", handle as EventListener);
    window.addEventListener("deviceorientation", handle as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handle as EventListener);
      window.removeEventListener("deviceorientation", handle as EventListener);
    };
  }, []);

  // --- Laske lähin löytämätön tarina ---
  const undiscovered = stories.filter((s) => !discovered.has(s.id));
  let nearest: { story: Story; dist: number; bear: number } | null = null;
  if (pos) {
    for (const s of undiscovered) {
      const dist = haversineDistance(pos.lat, pos.lng, s.lat, s.lng);
      if (!nearest || dist < nearest.dist) {
        nearest = { story: s, dist, bear: bearing(pos.lat, pos.lng, s.lat, s.lng) };
      }
    }
  }

  const allDiscovered = stories.length > 0 && undiscovered.length === 0;
  const showHint = nearest !== null && nearest.dist <= HINT_RADIUS_M;
  const arrowAngle = nearest ? nearest.bear - heading : 0;

  return (
    <div className="flex min-h-full flex-col">
      {/* Yläpalkki */}
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <Link
          href="/game-board"
          aria-label="Takaisin"
          className="text-sm text-cream/70 transition-colors hover:text-gold"
        >
          ←
        </Link>
        <h1 className="truncate text-sm font-bold text-cream">{board.name}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMap(true)}
            aria-label="Näytä kartta"
            className="text-lg transition-transform hover:scale-110"
          >
            🗺️
          </button>
          <span className="whitespace-nowrap text-xs font-semibold text-cream/80">
            {discovered.size}/{stories.length} 📖
          </span>
        </div>
      </header>

      {/* Pääsisältö */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        {error ? (
          <StatusCard>{error}</StatusCard>
        ) : stories.length === 0 ? (
          <StatusCard>Ei tarinoita vielä tällä alueella.</StatusCard>
        ) : allDiscovered ? (
          <StatusCard>Olet löytänyt kaikki tarinat! 🎉</StatusCard>
        ) : !pos ? (
          <p className="animate-pulse text-sm text-cream/60">
            Haetaan sijaintiasi…
          </p>
        ) : (
          nearest && (
            <>
              {/* Ohikulkuvihje */}
              {showHint && (
                <div className="animate-pulse rounded-full border border-gold/60 bg-gold/15 px-5 py-2 text-sm font-semibold text-gold shadow-glow">
                  Jotain kiinnostavaa lähistöllä…
                </div>
              )}

              {/* Kompassi */}
              <div
                className={`relative flex h-64 w-64 items-center justify-center rounded-full border-4 border-ocean bg-night/60 ${
                  showHint ? "shadow-glow-lg animate-pulse" : "shadow-glow"
                }`}
              >
                {/* ilmansuuntamerkit */}
                <span className="absolute top-2 text-xs text-cream/40">P</span>
                <span className="absolute bottom-2 text-xs text-cream/40">E</span>
                <span className="absolute left-2 text-xs text-cream/40">L</span>
                <span className="absolute right-2 text-xs text-cream/40">I</span>

                {/* nuoli */}
                <div
                  className="transition-transform duration-300 ease-out"
                  style={{ transform: `rotate(${arrowAngle}deg)` }}
                >
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <path
                      d="M60 12 L78 78 L60 64 L42 78 Z"
                      fill="#F4B942"
                      stroke="#0D1B2A"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Etäisyysteksti */}
              <p className="text-center text-lg font-semibold text-cream">
                {formatDistance(nearest.dist)}{" "}
                <span className="text-gold">
                  {directionLabel(nearest.bear)}
                </span>
              </p>
            </>
          )
        )}
      </main>

      <BottomNav />

      {activeStory && (
        <StoryModal
          story={activeStory}
          xp={activeStory.xp_reward}
          onClose={() => setActiveStory(null)}
        />
      )}

      {showMap && (
        <MapModal
          boundary={board.boundary}
          playerPos={pos}
          title={board.name}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card max-w-sm p-8 text-center text-cream/90">{children}</div>
  );
}
