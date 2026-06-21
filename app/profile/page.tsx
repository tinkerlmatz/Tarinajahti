import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ProfileActions from "@/components/profile/ProfileActions";
import type { Profile } from "@/types/database";

function rankingTitle(xp: number): string {
  if (xp >= 500) return "Mestarijahtaaja";
  if (xp >= 300) return "Kaupungin Tuntija";
  if (xp >= 150) return "Lähilegenda";
  if (xp >= 50) return "Tarinan Etsijä";
  return "Utelias Kulkija";
}

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

  const [profileRes, discoveredRes, storiesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("discovered_stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase.from("stories").select("id", { count: "exact", head: true }),
  ]);

  const profile = profileRes.data as Profile | null;
  const xp = profile?.total_xp ?? 0;
  const found = discoveredRes.count ?? 0;
  const totalStories = storiesRes.count ?? 0;

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
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-cream">
              {profile?.username ?? "Jahtaaja"}
            </h1>
            <p className="text-lg font-bold text-gold">{rankingTitle(xp)}</p>
            {profile?.created_at && (
              <p className="text-xs text-cream/50">
                Jahtaaja seit {formatDate(profile.created_at)}
              </p>
            )}
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
