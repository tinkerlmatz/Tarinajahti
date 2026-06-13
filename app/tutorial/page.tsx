import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Tutorial from "@/components/tutorial/Tutorial";

export default async function TutorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <Tutorial userId={user.id} />;
}
