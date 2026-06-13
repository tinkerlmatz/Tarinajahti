import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Tarkista onko tutoriaali jo nähty.
  const { data: profile } = await supabase
    .from("profiles")
    .select("tutorial_seen")
    .eq("id", user.id)
    .single();

  if (!profile?.tutorial_seen) redirect("/tutorial");

  redirect("/game-board");
}
