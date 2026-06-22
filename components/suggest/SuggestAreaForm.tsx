"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const VOTE_THRESHOLD = 10;
const SHARE_URL = "https://tarinajahti.vercel.app";
const SHARE_TEXT = "Tule mukaan Tarinajahtiin! 🗺️";

export default function SuggestAreaForm({ userId }: { userId: string }) {
  const supabase = createClient();

  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [reason, setReason] = useState("");
  const [existing, setExisting] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function insertRow(withReason: boolean) {
    const { error: insErr } = await supabase.from("area_suggestions").insert({
      suggested_by: userId,
      area_name: area.trim(),
      city: city.trim(),
      reason: withReason ? reason.trim() : "",
    });
    return insErr;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!city.trim() || !area.trim()) {
      setError("Täytä kunta ja kaupunginosa/kylä.");
      return;
    }

    setSaving(true);
    // Onko sama alue jo ehdotettu?
    const { data: rows } = await supabase
      .from("area_suggestions")
      .select("suggested_by")
      .eq("area_name", area.trim())
      .eq("city", city.trim())
      .eq("status", "pending");

    if (rows && rows.length > 0) {
      setExisting({ count: rows.length });
      setSaving(false);
      return;
    }

    const insErr = await insertRow(true);
    setSaving(false);
    if (insErr) {
      setError("Tallennus epäonnistui. Yritä uudelleen.");
      return;
    }
    setDone(true);
  }

  async function join() {
    setSaving(true);
    const insErr = await insertRow(false);
    setSaving(false);
    if (insErr) {
      setError("Liittyminen epäonnistui. Yritä uudelleen.");
      return;
    }
    setDone(true);
  }

  function cancel() {
    setExisting(null);
    setCity("");
    setArea("");
    setReason("");
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Tarinajahti",
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
      } catch {
        // peruttu
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      alert("Linkki kopioitu leikepöydälle!");
    }
  }

  if (done) {
    return (
      <div className="card mt-6 p-8 text-center">
        <div className="text-5xl">🎉</div>
        <p className="mt-3 text-cream/90">
          Kiitos ehdotuksesta! Jaa linkki kavereille ja pyydä heitä liittymään
          ehdotukseen.
        </p>
        <button onClick={share} className="btn-gold mt-6">
          Jaa Tarinajahti kavereille
        </button>
        <Link
          href="/game-board"
          className="mt-3 block text-sm text-cream/60 hover:text-gold"
        >
          Takaisin
        </Link>
      </div>
    );
  }

  // Sama alue jo ehdotettu → liity tai peruuta.
  if (existing) {
    return (
      <div className="card mt-6 p-6 text-center">
        <p className="text-cream/90">
          Joku on jo ehdottanut tätä aluetta!{" "}
          <span className="font-bold text-gold">
            ({existing.count}/{VOTE_THRESHOLD} ehdotusta)
          </span>
        </p>
        <button onClick={join} disabled={saving} className="btn-gold mt-6">
          {saving ? "Hetki…" : "Liity ehdotukseen"}
        </button>
        <button
          onClick={cancel}
          className="mt-3 block w-full text-sm text-cream/60 hover:text-cream"
        >
          Peruuta
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm leading-relaxed text-cream/70">
        Tarinajahti laajenee uusille alueille pelaajien ehdotusten mukaan.
        Ehdota omaa aluettasi ja kutsu kaverit äänestämään — kun alue saa{" "}
        {VOTE_THRESHOLD} ehdotusta, se avataan tarinoiden keräämiseen!
      </p>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kunta tai kaupunki
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="field"
          placeholder="Esim. Oulu"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kaupunginosa tai kylä
        </label>
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="field"
          placeholder="Esim. Tuira"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Lyhyt perustelu{" "}
          <span className="font-normal text-cream/50">(valinnainen)</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          rows={3}
          className="field resize-none"
          placeholder="Miksi tämä alue olisi hyvä jahtialue?"
        />
        <p className="mt-1 text-right text-xs text-cream/40">
          {reason.length}/200
        </p>
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={saving} className="btn-gold">
        {saving ? "Tarkistetaan…" : "Lähetä ehdotus"}
      </button>
    </form>
  );
}
