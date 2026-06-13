import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Kirjautunut käyttäjä — näkymät tulossa.
  return (
    <main className="flex min-h-full flex-col items-center justify-center p-6 text-center">
      <p className="text-lg text-cream">Olet kirjautunut sisään.</p>
      <p className="mt-1 text-sm text-cream/60">
        Pelinäkymät rakennetaan seuraavaksi.
      </p>
    </main>
  );
}
