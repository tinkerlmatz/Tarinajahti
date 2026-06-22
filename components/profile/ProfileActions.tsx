"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SHARE_URL = "https://tarinajahti.vercel.app";
const SHARE_TEXT = "Tule mukaan Tarinajahtiin! 🗺️";

export default function ProfileActions() {
  const router = useRouter();

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Tarinajahti",
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
      } catch {
        // käyttäjä perui jaon — ei toimenpiteitä
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      alert("Linkki kopioitu leikepöydälle!");
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-2.5">
      <button
        onClick={share}
        className="block w-full rounded-xl border border-gold/50 py-3 text-center text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
      >
        Lähetä pelin linkki
      </button>
      <Link
        href="/suggest-story"
        className="block w-full rounded-xl border border-gold/50 py-3 text-center text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
      >
        Ehdota tarinapistettä
      </Link>
      <Link
        href="/tutorial"
        className="block w-full rounded-xl border border-gold/50 py-3 text-center text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
      >
        Näin pelataan
      </Link>
      <button
        onClick={logout}
        className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-cream/70 transition-colors hover:border-white/30 hover:text-cream"
      >
        Kirjaudu ulos
      </button>
    </div>
  );
}
