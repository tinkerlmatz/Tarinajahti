import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlayView from "@/components/play/PlayView";
import type { GameBoard, Story } from "@/types/database";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [boardRes, storiesRes, discoveredRes, profileRes] = await Promise.all([
    supabase.from("game_boards").select("*").eq("id", boardId).single(),
    supabase.from("stories").select("*").eq("board_id", boardId),
    supabase
      .from("discovered_stories")
      .select("story_id")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("total_xp, distance_walked_meters, distance_cycled_meters")
      .eq("id", user.id)
      .single(),
  ]);

  if (!boardRes.data) redirect("/game-board");

  const discoveredIds = (discoveredRes.data ?? []).map((d) => d.story_id);

  return (
    <PlayView
      board={boardRes.data as GameBoard}
      stories={(storiesRes.data ?? []) as Story[]}
      discoveredIds={discoveredIds}
      userId={user.id}
      baseXp={profileRes.data?.total_xp ?? 0}
      baseWalk={profileRes.data?.distance_walked_meters ?? 0}
      baseCycle={profileRes.data?.distance_cycled_meters ?? 0}
    />
  );
}
