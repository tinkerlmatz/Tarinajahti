import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Countdown from "@/components/Countdown";
import AreaVoteButton from "@/components/gameboard/AreaVoteButton";
import ShowAreaButton from "@/components/gameboard/ShowAreaButton";
import type { GameBoard, AreaSuggestion } from "@/types/database";

// Tarinoiden vähimmäismäärä ennen kuin alue on pelattavissa.
const STORY_THRESHOLD = 25;
// Alueehdotusten äänikynnys ennen kuin alue perustetaan.
const AREA_VOTE_THRESHOLD = 25;

function hasStarted(board: GameBoard): boolean {
  return !board.start_date || new Date(board.start_date).getTime() <= Date.now();
}

function hasEnded(board: GameBoard): boolean {
  return !!board.end_date && new Date(board.end_date).getTime() <= Date.now();
}

export default async function GameBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [boardsRes, storiesRes, areasRes] = await Promise.all([
    supabase.from("game_boards").select("*").order("name"),
    supabase.from("stories").select("board_id"),
    supabase.from("area_suggestions").select("*"),
  ]);

  const boards = boardsRes.data;
  const storyRows = storiesRes.data;
  const areaRows = areasRes.data;

  // --- DEBUG: tulosta mitä Supabase palauttaa (näkyy palvelinlokissa) ---
  console.log("[game-board] boards error:", boardsRes.error);
  console.log("[game-board] boards data:", JSON.stringify(boards));
  console.log("[game-board] boards count:", boards?.length ?? 0);
  console.log("[game-board] stories error:", storiesRes.error);

  // Laske tarinoiden määrä per alue.
  const storyCount = new Map<string, number>();
  for (const row of storyRows ?? []) {
    storyCount.set(row.board_id, (storyCount.get(row.board_id) ?? 0) + 1);
  }

  // Luokittele alueet. Päättyneet piilotetaan.
  // Aktiivinen = alkanut, ei päättynyt, tarinoita >= 25.
  // Keräävä    = ei päättynyt eikä aktiivinen (myös vielä alkamattomat alueet).
  const live = (boards ?? []).filter((b) => !hasEnded(b));
  const active = live.filter(
    (b) => hasStarted(b) && (storyCount.get(b.id) ?? 0) >= STORY_THRESHOLD
  );
  const collecting = live.filter((b) => !active.includes(b));

  console.log(
    "[game-board] classified:",
    live.map((b) => ({
      name: b.name,
      started: hasStarted(b),
      stories: storyCount.get(b.id) ?? 0,
      bucket: active.includes(b) ? "active" : "collecting",
    }))
  );

  // Ryhmittele alueehdotukset area_name + city mukaan.
  const groups = new Map<
    string,
    { areaName: string; city: string; count: number; userVoted: boolean }
  >();
  for (const s of (areaRows ?? []) as AreaSuggestion[]) {
    const key = `${s.area_name}|||${s.city}`;
    const g =
      groups.get(key) ??
      { areaName: s.area_name, city: s.city, count: 0, userVoted: false };
    g.count += 1;
    if (s.suggested_by === user.id) g.userVoted = true;
    groups.set(key, g);
  }
  const areaGroups = [...groups.values()].sort((a, b) => b.count - a.count);

  const nothing =
    active.length === 0 && collecting.length === 0 && areaGroups.length === 0;

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-md flex-1 space-y-8 p-5 pb-8">
        <h1 className="pt-2 text-2xl font-extrabold text-cream">
          Valitse <span className="text-gold">jahtialue</span>
        </h1>

        {nothing && (
          <div className="card mt-8 p-8 text-center">
            <p className="text-lg font-semibold text-cream">
              Ei pelialueita vielä.
            </p>
            <Link
              href="/suggest-area"
              className="btn-gold mt-6 inline-block w-auto px-6"
            >
              Ehdota uutta jahtialuetta!
            </Link>
          </div>
        )}

        {/* AKTIIVISET ALUEET */}
        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gold/80">
              Aktiiviset alueet
            </h2>
            {active.map((board) => (
              <div
                key={board.id}
                className="rounded-2xl border-2 border-gold bg-ocean/60 p-5 shadow-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-extrabold text-cream">
                    {board.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold">
                    {storyCount.get(board.id) ?? 0} tarinaa
                  </span>
                </div>
                {board.description && (
                  <p className="mt-1.5 text-sm text-cream/70">
                    {board.description}
                  </p>
                )}
                <div className="mt-3 space-y-1 text-sm">
                  {board.end_date && <Countdown endDate={board.end_date} />}
                  {board.loot_title && (
                    <p className="text-cream/90">
                      🏆 Palkinto:{" "}
                      <span className="font-semibold text-gold">
                        {board.loot_title}
                      </span>
                    </p>
                  )}
                </div>
                <Link
                  href={`/play/${board.id}`}
                  className="btn-gold mt-4 block text-center"
                >
                  Pelaa
                </Link>
                {board.boundary ? (
                  <div className="mt-2 flex justify-center">
                    <ShowAreaButton boundary={board.boundary} title={board.name} />
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        )}

        {/* TULOSSA — TARINOITA KERÄTÄÄN */}
        {collecting.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cream/50">
              Tulossa — tarinoita kerätään
            </h2>
            {collecting.map((board) => {
              const count = storyCount.get(board.id) ?? 0;
              return (
                <div
                  key={board.id}
                  className="rounded-2xl border border-ocean bg-ocean/30 p-5 opacity-80"
                >
                  <h3 className="text-lg font-bold text-cream/90">
                    {board.name}
                  </h3>
                  {board.description && (
                    <p className="mt-1 text-sm text-cream/60">
                      {board.description}
                    </p>
                  )}
                  <p className="mt-3 text-sm font-semibold text-cream/80">
                    Tarinoita: {count}/{STORY_THRESHOLD} — peli alkaa pian!
                  </p>
                  <ProgressBar value={count} max={STORY_THRESHOLD} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/suggest-story?board=${board.id}`}
                      className="inline-block rounded-lg border border-gold/60 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
                    >
                      Ehdota tarinapistettä
                    </Link>
                    {board.boundary ? (
                      <ShowAreaButton boundary={board.boundary} title={board.name} />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* TULOSSA — ALUEEHDOTUKSET */}
        {areaGroups.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cream/40">
              Tulossa — alueehdotukset
            </h2>
            {areaGroups.map((g) => (
              <div
                key={`${g.areaName}|${g.city}`}
                className="rounded-2xl border border-white/15 bg-ocean/20 p-5 opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-cream">
                      {g.areaName}
                    </h3>
                    <p className="text-sm text-cream/60">{g.city}</p>
                  </div>
                  <AreaVoteButton
                    userId={user.id}
                    areaName={g.areaName}
                    city={g.city}
                    alreadyVoted={g.userVoted}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-cream/70">
                  {g.count}/{AREA_VOTE_THRESHOLD} alueehdotusta
                </p>
                <ProgressBar value={g.count} max={AREA_VOTE_THRESHOLD} />
              </div>
            ))}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-night/60">
      <div
        className="h-full rounded-full bg-gold transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
