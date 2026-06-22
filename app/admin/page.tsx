import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminPanel from "@/components/admin/AdminPanel";
import type { GameBoard, Story, StorySuggestion } from "@/types/database";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) redirect("/game-board");

  const [boardsRes, storiesRes, suggRes, profilesRes, areasRes] =
    await Promise.all([
      supabase.from("game_boards").select("*").order("name"),
      supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("story_suggestions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username"),
      supabase
        .from("area_suggestions")
        .select("area_name, city")
        .eq("status", "pending"),
    ]);

  const stories = (storiesRes.data ?? []) as Story[];
  const boardsRaw = (boardsRes.data ?? []) as GameBoard[];

  // Tarinoiden määrä per alue.
  const storyCount = new Map<string, number>();
  for (const s of stories) {
    storyCount.set(s.board_id, (storyCount.get(s.board_id) ?? 0) + 1);
  }
  const boards = boardsRaw.map((b) => ({
    ...b,
    story_count: storyCount.get(b.id) ?? 0,
  }));

  // Ehdottajien nimet.
  const nameById = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    nameById.set(p.id, p.username);
  }
  const suggestions = ((suggRes.data ?? []) as StorySuggestion[]).map((s) => ({
    ...s,
    suggester_name: nameById.get(s.suggested_by) ?? "Tuntematon",
  }));

  // Avoimet alue-ehdotukset: ryhmitelty, count >= 10, ei vielä aluetta.
  const existingBoardKeys = new Set(
    boardsRaw.map((b) => `${b.name}|||${b.city ?? ""}`)
  );
  const areaGroups = new Map<
    string,
    { areaName: string; city: string; count: number }
  >();
  for (const a of areasRes.data ?? []) {
    const key = `${a.area_name}|||${a.city}`;
    const g = areaGroups.get(key) ?? {
      areaName: a.area_name,
      city: a.city,
      count: 0,
    };
    g.count += 1;
    areaGroups.set(key, g);
  }
  const openAreas = [...areaGroups.values()].filter(
    (g) =>
      g.count >= 10 &&
      !existingBoardKeys.has(`${g.areaName}|||${g.city}`)
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/profile"
          aria-label="Takaisin"
          className="text-lg text-cream/70 transition-colors hover:text-gold"
        >
          ←
        </Link>
        <h1 className="text-2xl font-extrabold text-cream">Admin-paneeli</h1>
      </div>
      <AdminPanel
        userId={user.id}
        boards={boards}
        stories={stories}
        suggestions={suggestions}
        openAreas={openAreas}
      />
    </main>
  );
}
