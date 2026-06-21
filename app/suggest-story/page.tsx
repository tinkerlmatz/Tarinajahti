import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SuggestStoryForm from "@/components/suggest/SuggestStoryForm";
import type { GameBoard } from "@/types/database";

export default async function SuggestStoryPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board: boardParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Hae kohdealue: parametrista tai ensimmäinen ei-päättynyt alue.
  const { data: boards } = await supabase.from("game_boards").select("*");
  const now = Date.now();
  const all = (boards ?? []) as GameBoard[];
  const board =
    (boardParam && all.find((b) => b.id === boardParam)) ||
    all.find((b) => !b.end_date || new Date(b.end_date).getTime() > now) ||
    all[0];

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5 pb-10">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-cream">
          Ehdota tarinapistettä
        </h1>
        <Link
          href="/game-board"
          className="text-sm text-cream/60 hover:text-gold"
        >
          ←
        </Link>
      </div>

      {board ? (
        <SuggestStoryForm
          boardId={board.id}
          boardName={board.name}
          boundary={board.boundary}
          userId={user.id}
        />
      ) : (
        <p className="text-sm text-cream/60">Ei pelialueita saatavilla.</p>
      )}
    </main>
  );
}
