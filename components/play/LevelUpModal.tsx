"use client";

import { useEffect } from "react";
import { playFanfare } from "@/lib/sound";

export default function LevelUpModal({
  level,
  title,
  onClose,
}: {
  level: number;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    playFanfare();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-night/95 p-6 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 animate-flash bg-gold/15" />
      <div className="animate-unfurl text-7xl drop-shadow-[0_0_18px_rgba(244,185,66,0.7)]">
        🎉
      </div>
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-gold/80">
          Tason nousu!
        </p>
        <p className="mt-2 text-2xl font-extrabold text-gold drop-shadow-[0_0_12px_rgba(244,185,66,0.6)]">
          Olet nyt tasolla {level}:
        </p>
        <p className="mt-1 text-xl font-extrabold text-cream">{title}</p>
      </div>
      <button onClick={onClose} className="btn-gold max-w-xs">
        Jatka jahtia
      </button>
    </div>
  );
}
