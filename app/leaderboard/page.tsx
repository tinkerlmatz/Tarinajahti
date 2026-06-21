import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PlayTimeLeft from "@/components/leaderboard/PlayTimeLeft";
import type { GameBoard, Profile } from "@/types/database";

const MEDALS = [
  "/icons/mitali-kulta.svg",
  "/icons/mitali-hopea.svg",
  "/icons/mitali-pronssi.svg",
];

// Hehkutyyli top 3 -riveille.
const GLOW = [
  "border-gold/70 shadow-[0_0_20px_rgba(244,185,66,0.35)] bg-gold/10",
  "border-slate-300/60 shadow-[0_0_18px_rgba(203,213,225,0.3)] bg-slate-300/5",
  "border-amber-700/60 shadow-[0_0_18px_rgba(180,120,60,0.3)] bg-amber-800/10",
];

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [boardsRes, topRes, discoveredRes, meRes] = await Promise.all([
    supabase.from("game_boards").select("*"),
    supabase
      .from("profiles")
      .select("id, username, total_xp")
      .order("total_xp", { ascending: false })
      .limit(10),
    supabase.from("discovered_stories").select("user_id"),
    supabase
      .from("profiles")
      .select("id, username, total_xp")
      .eq("id", user.id)
      .single(),
  ]);

  // Aktiivinen alue countdownia varten: alkanut, ei päättynyt, end_date asetettu.
  const now = Date.now();
  const activeBoard = (boardsRes.data ?? [])
    .filter(
      (b: GameBoard) =>
        b.end_date &&
        new Date(b.end_date).getTime() > now &&
        (!b.start_date || new Date(b.start_date).getTime() <= now)
    )
    .sort(
      (a, b) =>
        new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime()
    )[0];

  // Löydettyjen tarinoiden määrä per käyttäjä.
  const storyCount = new Map<string, number>();
  for (const row of discoveredRes.data ?? []) {
    storyCount.set(row.user_id, (storyCount.get(row.user_id) ?? 0) + 1);
  }

  const top = (topRes.data ?? []) as Pick<
    Profile,
    "id" | "username" | "total_xp"
  >[];
  const inTop = top.some((p) => p.id === user.id);
  const myXp = meRes.data?.total_xp ?? 0;

  // Oma sijoitus jos ei top 10:ssä: montako pelaajaa on edellä.
  let myRank: number | null = null;
  if (!inTop) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("total_xp", myXp);
    myRank = (count ?? 0) + 1;
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5 pb-8">
        <header className="space-y-1 pt-2 text-center">
          <h1 className="text-3xl font-extrabold text-cream">Tulokset</h1>
          {activeBoard?.end_date && (
            <PlayTimeLeft endDate={activeBoard.end_date} />
          )}
        </header>

        {top.length === 0 ? (
          <div className="card p-8 text-center text-cream/70">
            Ei pelaajia vielä.
          </div>
        ) : (
          <ol className="space-y-2.5">
            {top.map((p, i) => {
              const isMe = p.id === user.id;
              const medal = i < 3 ? MEDALS[i] : null;
              const glow = i < 3 ? GLOW[i] : "border-white/10 bg-ocean/40";
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${glow} ${
                    isMe ? "ring-2 ring-blue-400" : ""
                  }`}
                >
                  {/* Sijoitus / mitali */}
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

                  {/* Nimimerkki */}
                  <span className="min-w-0 flex-1 truncate font-bold text-cream">
                    {p.username}
                    {isMe && (
                      <span className="ml-1.5 text-xs font-normal text-blue-300">
                        (sinä)
                      </span>
                    )}
                  </span>

                  {/* XP + tarinat */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-sm">
                    <span className="flex items-center gap-1 font-extrabold text-gold">
                      {p.total_xp}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icons/xp.svg" alt="XP" className="h-4 w-4" />
                    </span>
                    <span className="flex items-center gap-1 text-xs text-cream/60">
                      {storyCount.get(p.id) ?? 0}
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

        {/* Oma sijoitus jos ei top 10:ssä */}
        {myRank !== null && (
          <div className="rounded-2xl border-2 border-blue-400 bg-ocean/50 p-4 text-center">
            <p className="text-sm text-cream/80">
              Sinun sijoituksesi:{" "}
              <span className="font-extrabold text-cream">{myRank}.</span>
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-gold">
              {myXp}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/xp.svg" alt="XP" className="h-4 w-4" />
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
