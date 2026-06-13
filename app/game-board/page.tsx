import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function GameBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Placeholder — pelialueen valinta (näkymä 3) rakennetaan seuraavaksi.
  return (
    <main className="flex min-h-full flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-extrabold text-gold">Pelialueen valinta</h1>
      <p className="mt-2 text-sm text-cream/60">Tämä näkymä rakennetaan seuraavaksi.</p>
    </main>
  );
}
