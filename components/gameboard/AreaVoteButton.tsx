"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const VOTE_THRESHOLD = 10;

export default function AreaVoteButton({
  userId,
  areaName,
  city,
  count,
  alreadyVoted,
}: {
  userId: string;
  areaName: string;
  city: string;
  count: number;
  alreadyVoted: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [joined, setJoined] = useState(alreadyVoted);
  const [localCount, setLocalCount] = useState(count);
  const [loading, setLoading] = useState(false);

  async function join() {
    if (joined || loading) return;
    setLoading(true);
    const { error } = await supabase.from("area_suggestions").insert({
      suggested_by: userId,
      area_name: areaName,
      city,
      reason: "",
    });
    setLoading(false);
    if (!error) {
      setJoined(true);
      setLocalCount((c) => c + 1);
      router.refresh();
    }
  }

  if (joined) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-gold/90">
        ✓ Olet mukana ({localCount}/{VOTE_THRESHOLD})
      </span>
    );
  }

  return (
    <button
      onClick={join}
      disabled={loading}
      className="whitespace-nowrap rounded-lg bg-gold/90 px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold disabled:opacity-50"
    >
      {loading ? "Hetki…" : "Liity ehdotukseen"}
    </button>
  );
}
