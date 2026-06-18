"use client";

import { useEffect } from "react";
import { playFanfare } from "@/lib/sound";
import type { StoryCategory } from "@/types/database";

const ICON: Record<StoryCategory, string> = {
  historia: "📜",
  legenda: "⚡",
  muisto: "⏳",
};

const ANIM: Record<StoryCategory, string> = {
  historia: "animate-unfurl",
  legenda: "animate-flash",
  muisto: "animate-flip",
};

export default function DiscoveryAnimation({
  category,
  onOpen,
}: {
  category: StoryCategory;
  onOpen: () => void;
}) {
  useEffect(() => {
    playFanfare();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-night/95 backdrop-blur-sm">
      {category === "legenda" && (
        <div className="pointer-events-none absolute inset-0 animate-flash bg-gold/20" />
      )}
      <div className={`text-8xl ${ANIM[category] ?? ""}`} aria-hidden>
        {ICON[category] ?? "✨"}
      </div>
      <p className="text-2xl font-extrabold tracking-wide text-gold drop-shadow-[0_0_12px_rgba(244,185,66,0.6)]">
        Löysit tarinan!
      </p>
      <button onClick={onOpen} className="btn-gold max-w-xs">
        Avaa tarina
      </button>
    </div>
  );
}
