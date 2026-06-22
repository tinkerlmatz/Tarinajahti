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

  const { data: boards } = await supabase.from("game_boards").select("*");
  const now = Date.now();
  // Aktiiviset tai tulossa olevat alueet (end_date tulevaisuudessa tai null).
  const eligible = ((boards ?? []) as GameBoard[]).filter(
    (b) => !b.end_date || new Date(b.end_date).getTime() > now
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5 pb-10">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-cream">
          Ehdota tarinapistettä
        </h1>
        <Link
          href="/game-board"
          aria-label="Takaisin"
          className="text-sm text-cream/60 hover:text-gold"
        >
          ←
        </Link>
      </div>

      {eligible.length > 0 ? (
        <SuggestStoryForm
          boards={eligible.map((b) => ({
            id: b.id,
            name: b.name,
            city: b.city,
            boundary: b.boundary,
          }))}
          initialBoardId={boardParam}
          userId={user.id}
        />
      ) : (
        <p className="text-sm text-cream/60">Ei pelialueita saatavilla.</p>
      )}
    </main>
  );
}
