import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SuggestAreaForm from "@/components/suggest/SuggestAreaForm";

export default async function SuggestAreaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5 pb-10">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-cream">
          Ehdota uutta jahtialuetta
        </h1>
        <Link
          href="/game-board"
          aria-label="Takaisin"
          className="text-lg text-cream/60 hover:text-gold"
        >
          ←
        </Link>
      </div>

      <SuggestAreaForm userId={user.id} />
    </main>
  );
}
