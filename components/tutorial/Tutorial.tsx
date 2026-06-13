"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Card = {
  icon: string;
  title: string;
  text: string;
};

const CARDS: Card[] = [
  {
    icon: "🗺️",
    title: "Tarinat ovat piilossa",
    text: "Kaupunginosasi on täynnä tarinoita — mutta ne ovat piilossa. Sinun tehtäväsi on löytää ne.",
  },
  {
    icon: "🧭",
    title: "Seuraa kompassia",
    text: "Kompassi näyttää suunnan ja etäisyyden lähimpään löytämättömään tarinaan. Seuraa sitä.",
  },
  {
    icon: "✨",
    title: "Löydä tarina",
    text: "Kun olet 15 metrin päässä tarinasta, se avautuu automaattisesti. Jokainen löytö tuo XP:tä.",
  },
  {
    icon: "🏆",
    title: "Kilpaile",
    text: "Kerää XP:tä, kiipeä leaderboardille ja katso kuka löytää eniten tarinoita ennen pelin loppua.",
  },
  {
    icon: "💡",
    title: "Ehdota tarinoita",
    text: "Tiedätkö jonkin kiinnostavan paikan tai tarinan? Ehdota uutta tarinapistettä ja saat XP-bonuksen jos se hyväksytään.",
  },
];

export default function Tutorial({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === CARDS.length - 1;

  function goNext() {
    if (isLast) {
      void finish();
    } else {
      setIndex((i) => Math.min(i + 1, CARDS.length - 1));
    }
  }

  function goPrev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  async function finish() {
    setFinishing(true);
    // Merkitään tutoriaali nähdyksi (sekä loppuun katsottaessa että ohitettaessa).
    await supabase
      .from("profiles")
      .update({ tutorial_seen: true })
      .eq("id", userId);
    router.push("/game-board");
    router.refresh();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
    touchStartX.current = null;
  }

  const card = CARDS[index];

  return (
    <main className="relative flex min-h-full flex-col p-6">
      {/* Ohita-linkki */}
      <div className="flex justify-end">
        <button
          onClick={finish}
          disabled={finishing}
          className="text-sm text-cream/60 transition-colors hover:text-gold disabled:opacity-50"
        >
          Ohita
        </button>
      </div>

      {/* Korttialue */}
      <div
        className="flex flex-1 items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative flex w-full max-w-sm items-center justify-center">
          {/* edellinen-nuoli */}
          {index > 0 && (
            <button
              onClick={goPrev}
              aria-label="Edellinen"
              className="absolute -left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-cream/40 transition-colors hover:text-gold"
            >
              ‹
            </button>
          )}

          <div
            key={index}
            className="card animate-[float-slow_6s_ease-in-out_infinite] w-full px-6 py-10 text-center shadow-glow"
          >
            <div className="mb-6 text-7xl" aria-hidden>
              {card.icon}
            </div>
            <h2 className="mb-3 text-2xl font-extrabold text-gold">
              {card.title}
            </h2>
            <p className="text-base leading-relaxed text-cream/90">
              {card.text}
            </p>
          </div>

          {/* seuraava-nuoli */}
          {!isLast && (
            <button
              onClick={goNext}
              aria-label="Seuraava"
              className="absolute -right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-cream/40 transition-colors hover:text-gold"
            >
              ›
            </button>
          )}
        </div>
      </div>

      {/* Edistymispisteet */}
      <div className="mb-6 flex justify-center gap-2.5">
        {CARDS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Kortti ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-gold"
                : i < index
                ? "w-2.5 bg-gold/60"
                : "w-2.5 bg-cream/20"
            }`}
          />
        ))}
      </div>

      {/* Pääpainike */}
      <button onClick={goNext} disabled={finishing} className="btn-gold mx-auto max-w-sm">
        {finishing
          ? "Hetki…"
          : isLast
          ? "Aloita seikkailu!"
          : "Seuraava"}
      </button>
    </main>
  );
}
