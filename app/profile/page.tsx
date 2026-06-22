import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ProfileActions from "@/components/profile/ProfileActions";
import UsernameEditor from "@/components/profile/UsernameEditor";
import { getLevel } from "@/lib/levels";
import type { Profile } from "@/types/database";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function km(meters: number): string {
  return (meters / 1000).toFixed(1).replace(".", ",");
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, discoveredRes, storiesRes, achievementsRes, boardsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("discovered_stories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.from("stories").select("id", { count: "exact", head: true }),
      supabase
        .from("achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("game_boards").select("id, name"),
    ]);

  const boardNameById = new Map<string, string>();
  for (const b of boardsRes.data ?? []) boardNameById.set(b.id, b.name);
  const achievements = achievementsRes.data ?? [];
  const MEDALS = [
    "/icons/mitali-kulta.svg",
    "/icons/mitali-hopea.svg",
    "/icons/mitali-pronssi.svg",
  ];

  const profile = profileRes.data as Profile | null;
  const xp = profile?.total_xp ?? 0;
  const found = discoveredRes.count ?? 0;
  const totalStories = storiesRes.count ?? 0;

  const lvl = getLevel(xp);
  // Edistyminen nykyisen tason sisällä seuraavaan tasoon.
  const progressPct = lvl.next
    ? Math.round(((xp - lvl.min) / (lvl.next.min - lvl.min)) * 100)
    : 100;

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-5 pb-8">
        {/* Pelaajan tiedot */}
        <section className="flex flex-col items-center gap-3 pt-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-gold/60 bg-ocean shadow-glow">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl">🧭</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <UsernameEditor
              initialUsername={profile?.username ?? "Jahtaaja"}
              userId={user.id}
            />
            <p className="text-lg font-bold text-gold">
              Olet tasolla {lvl.level}: {lvl.title}
            </p>
            {profile?.created_at && (
              <p className="text-xs text-cream/50">
                Tarinan jahtaaja {formatDate(profile.created_at)} lähtien
              </p>
            )}
          </div>

          {/* XP-edistymispalkki seuraavaan tasoon */}
          <div className="w-full max-w-xs">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-night/60">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-cream/60">
              {lvl.next
                ? `${lvl.xpToNext} XP seuraavaan tasoon (${lvl.next.title})`
                : "Olet saavuttanut korkeimman tason!"}
            </p>
          </div>
        </section>

        {/* Tilastot */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard icon="/icons/xp.svg" value={String(xp)} label="XP yhteensä" />
          <StatCard
            icon="/icons/tarinakirja.svg"
            value={`${found} / ${totalStories}`}
            label="Löydetyt tarinat"
          />
          <StatCard
            emoji="🚶"
            value={`${km(profile?.distance_walked_meters ?? 0)} km`}
            label="Kävely"
          />
          <StatCard
            emoji="🚴"
            value={`${km(profile?.distance_cycled_meters ?? 0)} km`}
            label="Pyöräily"
          />
        </section>

        {/* Saavutukset */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold/80">
            Saavutukset
          </h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-cream/60">
              Ei saavutuksia vielä — pelaa ja kiipeä kärkisijoille!
            </p>
          ) : (
            <div className="space-y-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="card flex items-center gap-3 p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={MEDALS[a.rank - 1] ?? MEDALS[2]}
                    alt={`Sija ${a.rank}`}
                    className="h-10 w-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-cream">
                      {boardNameById.get(a.board_id) ?? "Tuntematon alue"}
                    </p>
                    <p className="text-xs text-gold">Tarinajahti {a.season}</p>
                    <p className="text-xs text-cream/50">
                      {formatDate(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Admin-linkki */}
        {profile?.is_admin && (
          <Link
            href="/admin"
            className="block w-full rounded-xl border border-gold bg-gold/10 py-3 text-center text-sm font-bold text-gold transition-colors hover:bg-gold/20"
          >
            Admin-paneeli
          </Link>
        )}

        {/* Toiminnot */}
        <ProfileActions />
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({
  icon,
  emoji,
  value,
  label,
}: {
  icon?: string;
  emoji?: string;
  value: string;
  label: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-1 p-4 text-center">
      <div className="flex h-8 items-center justify-center">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="h-7 w-7" />
        ) : (
          <span className="text-2xl">{emoji}</span>
        )}
      </div>
      <span className="text-xl font-extrabold text-cream">{value}</span>
      <span className="text-xs text-cream/60">{label}</span>
    </div>
  );
}
