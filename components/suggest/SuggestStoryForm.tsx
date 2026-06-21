"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { pointInBoundary } from "@/lib/geo";
import type { StoryCategory } from "@/types/database";

type LatLng = { lat: number; lng: number };

const CATEGORIES: { value: StoryCategory; label: string; icon: string }[] = [
  { value: "historia", label: "Historia", icon: "📜" },
  { value: "legenda", label: "Legenda", icon: "⚡" },
  { value: "muisto", label: "Muisto", icon: "⏳" },
];

const MapPicker = dynamic(() => import("@/components/suggest/MapPicker"), {
  ssr: false,
});

export default function SuggestStoryForm({
  boardId,
  boardName,
  boundary,
  userId,
}: {
  boardId: string;
  boardName: string;
  boundary: unknown | null;
  userId: string;
}) {
  const supabase = createClient();

  const [category, setCategory] = useState<StoryCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Laitteesi ei tue paikannusta.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Sijainnin haku epäonnistui.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) return setError("Valitse tarinaluokka.");
    if (title.trim().length === 0) return setError("Anna otsikko.");
    if (description.trim().length === 0) return setError("Anna kuvaus.");
    if (!pos) return setError("Valitse sijainti.");
    if (boundary && !pointInBoundary(pos.lat, pos.lng, boundary)) {
      return setError("Tarina pitää sijaita pelialueella.");
    }

    setSaving(true);

    // Kuvan lataus Storageen (valinnainen).
    let imageUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("story-suggestions")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError("Kuvan lataus epäonnistui. Yritä ilman kuvaa.");
        setSaving(false);
        return;
      }
      const { data } = supabase.storage
        .from("story-suggestions")
        .getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    const { error: insErr } = await supabase
      .from("story_suggestions")
      .insert({
        board_id: boardId,
        suggested_by: userId,
        title: title.trim(),
        description: description.trim(),
        lat: pos.lat,
        lng: pos.lng,
        category,
        image_url: imageUrl,
        video_url: videoUrl.trim() || null,
      });

    setSaving(false);
    if (insErr) {
      setError("Tallennus epäonnistui. Yritä uudelleen.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card mt-8 p-8 text-center">
        <div className="text-5xl">🎉</div>
        <p className="mt-3 text-cream/90">
          Kiitos ehdotuksesta! Saat XP-bonuksen jos ehdotus hyväksytään.
        </p>
        <Link href="/game-board" className="btn-gold mt-6 inline-block">
          Takaisin peliin
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm leading-relaxed text-cream/70">
        Tiedätkö kiinnostavan paikan tai tarinan? Ehdota sitä mukaan
        Tarinajahtiin! Hyväksytystä ehdotuksesta saat XP-bonuksen.
        <br />
        <br />
        Tarinapisteen tulee sijaita yleisellä alueella — ei pihoilla,
        yksityisalueilla tai muuten rajatuilla paikoilla.
      </p>

      {/* Tarinaluokka */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-cream">
          Tarinaluokka
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors ${
                category === c.value
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-white/10 bg-ocean/40 text-cream/70 hover:border-gold/40"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Otsikko */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Otsikko
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          className="field"
          placeholder="Esim. Vanha mylly joen rannalla"
        />
        <p className="mt-1 text-right text-xs text-cream/40">{title.length}/60</p>
      </div>

      {/* Kuvaus */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kuvaus
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={5}
          className="field resize-none"
          placeholder="Kerro tarina tai paikan historia…"
        />
        <p className="mt-1 text-right text-xs text-cream/40">
          {description.length}/500
        </p>
      </div>

      {/* Kuva */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kuva <span className="font-normal text-cream/50">(valinnainen)</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-cream/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:font-semibold file:text-night"
        />
      </div>

      {/* Videolinkki */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Videolinkki{" "}
          <span className="font-normal text-cream/50">(valinnainen)</span>
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="field"
          placeholder="https://youtube.com/…"
        />
      </div>

      {/* Sijainti */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-cream">
          Sijainti ({boardName})
        </label>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="mb-3 w-full rounded-xl border border-gold/60 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {locating ? "Haetaan sijaintia…" : "Käytä nykyistä sijaintia"}
        </button>
        <MapPicker boundary={boundary} value={pos} onPick={setPos} />
        {pos && (
          <p className="mt-2 text-center text-xs text-cream/60">
            Valittu: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </p>
        )}
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={saving} className="btn-gold">
        {saving ? "Lähetetään…" : "Lähetä ehdotus"}
      </button>
    </form>
  );
}
