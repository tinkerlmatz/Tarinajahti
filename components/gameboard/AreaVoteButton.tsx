"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AreaVoteButton({
  userId,
  areaName,
  city,
  alreadyVoted,
}: {
  userId: string;
  areaName: string;
  city: string;
  alreadyVoted: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [voted, setVoted] = useState(alreadyVoted);
  const [loading, setLoading] = useState(false);

  async function vote() {
    if (voted || loading) return;
    setLoading(true);
    const { error } = await supabase.from("area_suggestions").insert({
      suggested_by: userId,
      area_name: areaName,
      city,
      reason: "",
    });
    setLoading(false);
    if (!error) {
      setVoted(true);
      router.refresh();
    }
  }

  if (voted) {
    return (
      <span className="text-sm font-semibold text-gold/80">✓ Äänestit</span>
    );
  }

  return (
    <button
      onClick={vote}
      disabled={loading}
      className="rounded-lg bg-gold/90 px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold disabled:opacity-50"
    >
      {loading ? "Hetki…" : "Äänestä!"}
    </button>
  );
}
