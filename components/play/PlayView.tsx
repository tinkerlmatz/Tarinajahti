"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { haversineDistance, bearing, formatDistance } from "@/lib/geo";
import type { GameBoard, Story } from "@/types/database";
import BottomNav from "@/components/BottomNav";
import StoryModal from "@/components/play/StoryModal";
import MapModal from "@/components/MapModal";
import DiscoveryAnimation from "@/components/play/DiscoveryAnimation";
import Compass from "@/components/play/Compass";
import SessionSummary, { type Summary } from "@/components/play/SessionSummary";
import { useCompassHeading } from "@/components/play/useCompassHeading";

const HINT_RADIUS_M = 100; // ohikulkuvihje
const DEFAULT_DISCOVERY_M = 15; // tarinan avautuminen
const FLUSH_INTERVAL_MS = 30000; // matkan kirjaus kantaan max 1x / 30s
const MIN_NEXT_DISTANCE_M = 500; // minimietäisyys seuraavaan tarinaan jatkettaessa

// km-pisteet: kävely 1 XP/km, pyöräily 0,5 XP/km (pyöristys alas).
function walkXpFrom(meters: number) {
  return Math.floor(meters / 1000);
}
function cycleXpFrom(meters: number) {
  return Math.floor(meters / 2000);
}

type Pos = { lat: number; lng: number };

// Normalisoi kulma välille (-180, 180].
function normalizeAngle(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}


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
  const router = useRouter();
  const {
    heading,
    hasDeviceHeading,
    needsPermission,
    requestPermission,
    unavailable,
  } = useCompassHeading();

  const [pos, setPos] = useState<Pos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(
    () => new Set(discoveredIds)
  );
  const [pendingStory, setPendingStory] = useState<Story | null>(null); // löytöanimaatio
  const [activeStory, setActiveStory] = useState<Story | null>(null); // tarinamodaali
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  // GPS-pohjainen kulkusuunta (fallback laiteanturille).
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const headingAnchor = useRef<{ lat: number; lng: number } | null>(null);

  // Refit (eivät aiheuta uudelleenrenderöintiä).
  const prevPos = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const accWalk = useRef(0);
  const accCycle = useRef(0);
  const accXp = useRef(0); // session aikana löydettyjen tarinoiden XP
  const sessionFound = useRef(0);
  const lastFlush = useRef(0);
  const discoveredRef = useRef<Set<string>>(new Set(discoveredIds));
  const requireFar = useRef(false); // seuraava kohde >= 500m
  const overlayOpen = useRef(false); // animaatio/modaali/yhteenveto auki
  const ended = useRef(false);

  // Pidä overlay-tila refissä position-käsittelijää varten.
  useEffect(() => {
    overlayOpen.current =
      pendingStory !== null || activeStory !== null || summary !== null;
  }, [pendingStory, activeStory, summary]);

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
      if (overlayOpen.current) return;
      for (const story of stories) {
        if (discoveredRef.current.has(story.id)) continue;
        const dist = haversineDistance(p.lat, p.lng, story.lat, story.lng);
        const radius = story.discovery_radius_meters || DEFAULT_DISCOVERY_M;
        if (dist <= radius) {
          discoveredRef.current.add(story.id);
          setDiscovered(new Set(discoveredRef.current));
          accXp.current += story.xp_reward;
          sessionFound.current += 1;
          setPendingStory(story); // käynnistä löytöanimaatio

          await supabase.from("discovered_stories").insert({
            user_id: userId,
            story_id: story.id,
          });
          await supabase
            .from("profiles")
            .update({ total_xp: baseXp + accXp.current })
            .eq("id", userId);
          break;
        }
      }
    },
    [stories, supabase, userId, baseXp]
  );

  // --- Sijainnin päivitys ---
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

      // GPS-kulkusuunta: päivitä kun on liikuttu väh. 5 m ankkurista.
      const anchor = headingAnchor.current;
      if (!anchor) {
        headingAnchor.current = { lat: p.lat, lng: p.lng };
      } else {
        const moved = haversineDistance(anchor.lat, anchor.lng, p.lat, p.lng);
        if (moved >= 5) {
          setGpsHeading(bearing(anchor.lat, anchor.lng, p.lat, p.lng));
          headingAnchor.current = { lat: p.lat, lng: p.lng };
        }
      }

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
    const id = navigator.geolocation.watchPosition(
      (pp) => onPosition(pp.coords),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Salli sijaintitietosi, jotta voit löytää tarinoita.");
        } else {
          setError("Paikannus epäonnistui. Yritä ulkona avoimella alueella.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      if (!ended.current) void flushDistance();
    };
  }, [onPosition, flushDistance]);

  // --- Kohteen valinta (500m-logiikka + lukitus) ---
  useEffect(() => {
    if (!pos) return;
    // Pidä nykyinen kohde jos se on yhä löytämättä.
    const current = stories.find(
      (s) => s.id === targetId && !discovered.has(s.id)
    );
    if (current) return;

    const candidates = stories
      .filter((s) => !discovered.has(s.id))
      .map((s) => ({
        s,
        d: haversineDistance(pos.lat, pos.lng, s.lat, s.lng),
      }));
    if (candidates.length === 0) {
      setTargetId(null);
      return;
    }

    let pool = candidates;
    if (requireFar.current) {
      const far = candidates.filter((c) => c.d >= MIN_NEXT_DISTANCE_M);
      if (far.length > 0) pool = far; // muuten fallback: lähin normaalisti
      requireFar.current = false;
    }
    pool.sort((a, b) => a.d - b.d);
    setTargetId(pool[0].s.id);
  }, [pos, discovered, stories, targetId]);

  // --- Session lopetus: km-pisteet + yhteenveto ---
  async function endSession() {
    ended.current = true;
    const walkXp = walkXpFrom(accWalk.current);
    const cycleXp = cycleXpFrom(accCycle.current);
    const distXp = walkXp + cycleXp;

    await supabase
      .from("profiles")
      .update({
        total_xp: baseXp + accXp.current + distXp,
        distance_walked_meters: Math.round(baseWalk + accWalk.current),
        distance_cycled_meters: Math.round(baseCycle + accCycle.current),
      })
      .eq("id", userId);

    setActiveStory(null);
    setSummary({
      walkKm: accWalk.current / 1000,
      cycleKm: accCycle.current / 1000,
      walkXp,
      cycleXp,
      storiesFound: sessionFound.current,
      storyXp: accXp.current,
      totalGained: accXp.current + distXp,
    });
  }

  function continueHunt() {
    setActiveStory(null);
    requireFar.current = true;
    setTargetId(null); // pakota uuden (kaukaisen) kohteen valinta
  }

  // --- Lasketut arvot ---
  const target = targetId
    ? stories.find((s) => s.id === targetId && !discovered.has(s.id))
    : null;
  const targetDist =
    target && pos
      ? haversineDistance(pos.lat, pos.lng, target.lat, target.lng)
      : null;
  const targetBear =
    target && pos
      ? bearing(pos.lat, pos.lng, target.lat, target.lng)
      : 0;

  const undiscoveredCount = stories.filter((s) => !discovered.has(s.id)).length;
  const allDiscovered = stories.length > 0 && undiscoveredCount === 0;
  const showHint = targetDist !== null && targetDist <= HINT_RADIUS_M;

  // Efektiivinen suunta: laiteanturi jos toimii, muuten GPS-kulkusuunta.
  const effectiveHeading = hasDeviceHeading
    ? heading
    : gpsHeading;
  const hasRotation = effectiveHeading !== null;
  // Neulan kulma suhteessa kulkusuuntaan: kohde edessä → 0° (ylös),
  // oikealla → 90°, takana → 180°. Normalisoidaan -180…+180 sujuvuuden vuoksi.
  const arrowAngle = hasRotation
    ? normalizeAngle(targetBear - (effectiveHeading as number))
    : 0;

  return (
    <div className="flex min-h-full flex-col">
      {/* Yläpalkki */}
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <Link
          href="/game-board"
          aria-label="Takaisin"
          className="text-lg text-cream/70 transition-colors hover:text-gold"
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
          target && (
            <>
              {showHint && (
                <div className="animate-pulse rounded-full border border-gold/60 bg-gold/15 px-5 py-2 text-sm font-semibold text-gold shadow-glow">
                  Jotain kiinnostavaa lähistöllä…
                </div>
              )}

              <div
                className={`w-full max-w-[280px] rounded-full transition-shadow ${
                  showHint ? "shadow-glow-lg animate-pulse" : ""
                }`}
              >
                <Compass rotation={arrowAngle} dim={!hasRotation} />
              </div>

              <p className="text-center text-lg font-semibold text-cream">
                {targetDist !== null && formatDistance(targetDist)}{" "}
                <span className="text-gold">kohteeseen</span>
              </p>

              {!hasRotation && (
                <p className="max-w-xs text-center text-xs text-cream/50">
                  Liiku muutama metri, niin neula osoittaa kohti tarinaa.
                </p>
              )}

              {needsPermission && (
                <button
                  onClick={requestPermission}
                  className="rounded-lg border border-gold/60 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/10"
                >
                  Ota kompassi käyttöön
                </button>
              )}

              {unavailable && (
                <p className="max-w-xs text-center text-xs text-red-400">
                  Kompassi ei saatavilla — tarkista selaimen asetukset.
                </p>
              )}

              <button
                onClick={endSession}
                className="text-xs font-semibold text-cream/50 underline-offset-2 transition-colors hover:text-cream/80 hover:underline"
              >
                Lopeta jahti
              </button>
            </>
          )
        )}
      </main>

      <BottomNav />

      {/* Löytöanimaatio → tarinamodaali */}
      {pendingStory && (
        <DiscoveryAnimation
          category={pendingStory.category}
          onOpen={() => {
            setActiveStory(pendingStory);
            setPendingStory(null);
          }}
        />
      )}

      {activeStory && (
        <StoryModal
          story={activeStory}
          xp={activeStory.xp_reward}
          onContinue={continueHunt}
          onEnd={endSession}
        />
      )}

      {summary && (
        <SessionSummary
          summary={summary}
          onClose={() => {
            router.push("/game-board");
            router.refresh();
          }}
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
