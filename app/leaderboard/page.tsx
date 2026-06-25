import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import LeaderboardTabs, {
  type Tab,
  type Entry,
} from "@/components/leaderboard/LeaderboardTabs";
import type { GameBoard } from "@/types/database";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [boardsRes, topRes, discoveredRes, storiesRes, profilesRes] =
    await Promise.all([
      supabase.from("game_boards").select("*"),
      supabase
        .from("profiles")
        .select("id, username, total_xp")
        .order("total_xp", { ascending: false })
        .limit(10),
      supabase.from("discovered_stories").select("user_id, story_id"),
      supabase.from("stories").select("id, board_id, xp_reward"),
      supabase.from("profiles").select("id, username"),
    ]);

  const now = Date.now();
  const boards = ((boardsRes.data ?? []) as GameBoard[]).filter(
    (b) => !b.end_date || new Date(b.end_date).getTime() > now
  );

  const nameById = new Map<string, string>();
  for (const p of profilesRes.data ?? []) nameById.set(p.id, p.username);

  // Globaali: tarinamäärät per käyttäjä (kaikki löydöt).
  const globalStoryCount = new Map<string, number>();
  for (const d of discoveredRes.data ?? []) {
    globalStoryCount.set(
      d.user_id,
      (globalStoryCount.get(d.user_id) ?? 0) + 1
    );
  }

  const top = (topRes.data ?? []) as {
    id: string;
    username: string;
    total_xp: number;
  }[];
  const globalEntries: Entry[] = top.map((p) => ({
    id: p.id,
    username: p.username,
    xp: p.total_xp,
    stories: globalStoryCount.get(p.id) ?? 0,
  }));

  // Oma globaali sijoitus jos ei top 10:ssä.
  const inTop = top.some((p) => p.id === user.id);
  let myRank: number | null = null;
  if (!inTop) {
    const { data: me } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", user.id)
      .single();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("total_xp", me?.total_xp ?? 0);
    myRank = (count ?? 0) + 1;
  }

  // Tarinametatieto: id → {board_id, xp}.
  const storyMeta = new Map<string, { board_id: string; xp: number }>();
  for (const s of storiesRes.data ?? []) {
    storyMeta.set(s.id, { board_id: s.board_id, xp: s.xp_reward });
  }

  // Aluekohtaiset listat.
  const perBoard = new Map<
    string,
    Map<string, { xp: number; stories: number }>
  >();
  for (const d of discoveredRes.data ?? []) {
    const meta = storyMeta.get(d.story_id);
    if (!meta) continue;
    let users = perBoard.get(meta.board_id);
    if (!users) {
      users = new Map();
      perBoard.set(meta.board_id, users);
    }
    const u = users.get(d.user_id) ?? { xp: 0, stories: 0 };
    u.xp += meta.xp;
    u.stories += 1;
    users.set(d.user_id, u);
  }

  const tabs: Tab[] = [
    {
      id: "all",
      label: "Kaikki alueet",
      entries: globalEntries,
      myRank,
      playerCount: nameById.size,
    },
    ...boards.map((b) => {
      const users = perBoard.get(b.id) ?? new Map();
      const entries: Entry[] = [...users.entries()]
        .map(([uid, v]) => ({
          id: uid,
          username: nameById.get(uid) ?? "Tuntematon",
          xp: v.xp,
          stories: v.stories,
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);
      return {
        id: b.id,
        label: b.name,
        entries,
        endDate: b.end_date,
        playerCount: users.size,
      };
    }),
  ];

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5 pb-8">
        <header className="pt-2 text-center">
          <h1 className="text-3xl font-extrabold text-cream">Tulokset</h1>
        </header>

        <LeaderboardTabs tabs={tabs} userId={user.id} />
      </main>

      <BottomNav />
    </div>
  );
}
