import Link from "next/link";
import Logo from "@/components/Logo";
import LoginForm from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import type { GameBoard, AreaSuggestion } from "@/types/database";

const STORY_THRESHOLD = 15;
const AREA_VOTE_THRESHOLD = 10;

function daysLeft(endDate: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
  );
}

const INFO = [
  {
    icon: "🔍",
    title: "Löydä tarinoita",
    text: "Lähiympäristösi on täynnä piilotettuja tarinoita. Sinun tehtäväsi on löytää ne.",
  },
  {
    icon: "⭐",
    title: "Ansaitse XP:tä",
    text: "Joka löydöstä saat pisteitä. Kiipeä leaderboardilla.",
  },
  {
    icon: "🧭",
    title: "Seuraa kompassia",
    text: "Kompassi ohjaa sinut seuraavaan tarinaan. Ei karttaa — vain suunta ja etäisyys.",
  },
  {
    icon: "💡",
    title: "Ehdota tarinoita",
    text: "Tiedätkö kiinnostavan paikan tai alueen legendan? Ehdota uutta tarinapistettä.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string }>;
}) {
  const { signup } = await searchParams;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    boardsRes,
    storiesRes,
    areasRes,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("game_boards").select("*"),
    supabase.from("stories").select("board_id"),
    supabase.from("area_suggestions").select("*").eq("status", "pending"),
  ]);

  // Tarinamäärät per alue.
  const storyCount = new Map<string, number>();
  for (const r of storiesRes.data ?? []) {
    storyCount.set(r.board_id, (storyCount.get(r.board_id) ?? 0) + 1);
  }

  const now = Date.now();
  const activeBoards = ((boardsRes.data ?? []) as GameBoard[]).filter(
    (b) =>
      (!b.start_date || new Date(b.start_date).getTime() <= now) &&
      (!b.end_date || new Date(b.end_date).getTime() > now) &&
      (storyCount.get(b.id) ?? 0) >= STORY_THRESHOLD
  );

  // Tulossa olevat alueet: area_suggestions ryhmiteltynä.
  const groups = new Map<
    string,
    { areaName: string; city: string; count: number }
  >();
  for (const s of (areasRes.data ?? []) as AreaSuggestion[]) {
    const key = `${s.area_name}|||${s.city}`;
    const g = groups.get(key) ?? {
      areaName: s.area_name,
      city: s.city,
      count: 0,
    };
    g.count += 1;
    groups.set(key, g);
  }
  const upcoming = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <main className="mx-auto w-full max-w-md space-y-8 p-6 pb-12">
      {/* Kirjautuminen */}
      <section className="flex flex-col items-center gap-8 pt-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo size="lg" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-cream">
              Lähiympäristösi on täynnä{" "}
              <span className="text-gold">tarinoita.</span>
            </p>
            <p className="text-sm text-cream/60">
              Löydä, jaa ja elä tarinat yhdessä.
            </p>
          </div>
        </div>
        <div className="card w-full p-6 shadow-glow">
          <LoginForm initialMode={signup ? "signup" : "signin"} />
        </div>
      </section>

      <Divider />

      {/* OSIO 1 — Aktiiviset pelialueet */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gold/80">
          Aktiiviset pelialueet
        </h2>
        {activeBoards.length === 0 ? (
          <p className="text-sm text-cream/60">
            Ei aktiivisia pelialueita juuri nyt.
          </p>
        ) : (
          activeBoards.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border-2 border-gold bg-ocean/50 p-4 shadow-glow"
            >
              <p className="font-bold text-cream">
                <span className="mr-1.5 text-green-400">🟢</span>
                {b.name}
              </p>
              <p className="mt-1 text-xs text-cream/60">
                {storyCount.get(b.id) ?? 0} tarinaa
                {b.end_date ? ` · Peliaikaa vielä ${daysLeft(b.end_date)} päivää` : ""}
              </p>
            </div>
          ))
        )}
      </section>

      {/* OSIO 2 — Tulossa olevat alueet (piilotetaan jos tyhjä) */}
      {upcoming.length > 0 && (
        <>
          <Divider />
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-cream/50">
              Tulossa olevat alueet
            </h2>
            {upcoming.map((g) => (
              <div
                key={`${g.areaName}|${g.city}`}
                className="rounded-2xl border border-white/15 bg-ocean/30 p-4"
              >
                <p className="font-bold text-cream">
                  <span className="mr-1.5 text-yellow-400">⏳</span>
                  {g.areaName}
                  <span className="font-normal text-cream/50">, {g.city}</span>
                </p>
                <p className="mt-1 text-xs text-cream/60">
                  {g.count}/{AREA_VOTE_THRESHOLD} ehdotusta
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-night/60">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{
                      width: `${Math.min(100, (g.count / AREA_VOTE_THRESHOLD) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      <Divider />

      {/* OSIO 3 — Info */}
      <section className="grid grid-cols-2 gap-3">
        {INFO.map((i) => (
          <div key={i.title} className="card p-4">
            <div className="text-3xl text-gold">{i.icon}</div>
            <p className="mt-2 font-bold text-cream">{i.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/60">
              {i.text}
            </p>
          </div>
        ))}
      </section>

      <Divider />

      {/* OSIO 4 — Uusi alue */}
      <section className="rounded-2xl border-2 border-gold bg-night/60 p-6 text-center shadow-glow">
        <h2 className="text-lg font-extrabold text-gold">
          Ei peliä omalla alueellasi?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cream/80">
          Tarinajahti laajenee uusille alueille pelaajien ehdotusten mukaan. Kun
          alue saa 10 ehdotusta, se avataan tarinoiden keräämiseen. Kun alueella
          on 15 hyväksyttyä tarinaa — peli alkaa!
        </p>
        <Link
          href={user ? "/suggest-area" : "/login?signup=1"}
          className="btn-gold mt-6 inline-block"
        >
          Rekisteröidy ja ehdota aluettasi
        </Link>
      </section>
    </main>
  );
}

function Divider() {
  return <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />;
}
