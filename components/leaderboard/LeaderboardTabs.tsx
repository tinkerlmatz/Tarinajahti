"use client";

import { useState } from "react";
import PlayTimeLeft from "@/components/leaderboard/PlayTimeLeft";

export type Entry = {
  id: string;
  username: string;
  xp: number;
  stories: number;
};

export type Tab = {
  id: string;
  label: string;
  entries: Entry[];
  myRank?: number | null;
  myXp?: number;
  endDate?: string | null;
};

const MEDALS = [
  "/icons/mitali-kulta.svg",
  "/icons/mitali-hopea.svg",
  "/icons/mitali-pronssi.svg",
];

const GLOW = [
  "border-gold/70 shadow-[0_0_20px_rgba(244,185,66,0.35)] bg-gold/10",
  "border-slate-300/60 shadow-[0_0_18px_rgba(203,213,225,0.3)] bg-slate-300/5",
  "border-amber-700/60 shadow-[0_0_18px_rgba(180,120,60,0.3)] bg-amber-800/10",
];

export default function LeaderboardTabs({
  tabs,
  userId,
}: {
  tabs: Tab[];
  userId: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "all");
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="space-y-4">
      {/* Välilehdet */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active === t.id
                ? "bg-gold text-night"
                : "bg-ocean/40 text-cream/70 hover:text-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Countdown vain aluevälilehdellä */}
      {tab && active !== "all" && tab.endDate && (
        <div className="text-center">
          <PlayTimeLeft endDate={tab.endDate} />
        </div>
      )}

      {!tab || tab.entries.length === 0 ? (
        <div className="card p-8 text-center text-cream/70">
          Ei pelaajia vielä.
        </div>
      ) : (
        <ol className="space-y-2.5">
          {tab.entries.map((p, i) => {
            const isMe = p.id === userId;
            const medal = i < 3 ? MEDALS[i] : null;
            const glow = i < 3 ? GLOW[i] : "border-white/10 bg-ocean/40";
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${glow} ${
                  isMe ? "ring-2 ring-blue-400" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  {medal ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={medal} alt={`Sija ${i + 1}`} className="h-10 w-10" />
                  ) : (
                    <span className="text-lg font-extrabold text-cream/70">
                      {i + 1}.
                    </span>
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate font-bold text-cream">
                  {p.username}
                  {isMe && (
                    <span className="ml-1.5 text-xs font-normal text-blue-300">
                      (sinä)
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-sm">
                  <span className="flex items-center gap-1 font-extrabold text-gold">
                    {p.xp}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/xp.svg" alt="XP" className="h-4 w-4" />
                  </span>
                  <span className="flex items-center gap-1 text-xs text-cream/60">
                    {p.stories}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/tarinakirja.svg"
                      alt="tarinaa"
                      className="h-4 w-4"
                    />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Oma sijoitus (vain globaali) */}
      {tab?.myRank != null && (
        <div className="rounded-2xl border-2 border-blue-400 bg-ocean/50 p-4 text-center">
          <p className="text-sm text-cream/80">
            Sinun sijoituksesi:{" "}
            <span className="font-extrabold text-cream">{tab.myRank}.</span>
          </p>
        </div>
      )}
    </div>
  );
}
