"use client";

import { useEffect } from "react";
import { playFanfare } from "@/lib/sound";
import type { StoryCategory } from "@/types/database";

const ICON_SRC: Record<StoryCategory, string> = {
  historia: "/icons/historia.svg",
  legenda: "/icons/legenda.svg",
  muisto: "/icons/muisto.svg",
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ICON_SRC[category] ?? "/icons/historia.svg"}
        alt=""
        aria-hidden
        className="h-40 w-40 drop-shadow-[0_0_16px_rgba(244,185,66,0.4)]"
      />
      <p className="text-2xl font-extrabold tracking-wide text-gold drop-shadow-[0_0_12px_rgba(244,185,66,0.6)]">
        Löysit tarinan!
      </p>
      <button onClick={onOpen} className="btn-gold max-w-xs">
        Avaa tarina
      </button>
    </div>
  );
}
