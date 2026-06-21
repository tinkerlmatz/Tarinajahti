"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { GameBoard, StorySuggestion, StoryCategory } from "@/types/database";

const MapPicker = dynamic(() => import("@/components/suggest/MapPicker"), {
  ssr: false,
});

const CATEGORIES: { value: StoryCategory; label: string }[] = [
  { value: "historia", label: "Historia" },
  { value: "legenda", label: "Legenda" },
  { value: "muisto", label: "Muisto" },
];

type LatLng = { lat: number; lng: number };

export default function SuggestionEditForm({
  suggestion,
  boards,
  onDone,
  onCancel,
}: {
  suggestion: StorySuggestion;
  boards: GameBoard[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();

  const [title, setTitle] = useState(suggestion.title);
  const [description, setDescription] = useState(suggestion.description);
  const [category, setCategory] = useState<StoryCategory>(suggestion.category);
  const [xp, setXp] = useState(suggestion.xp_reward ?? 25);
  const [radius, setRadius] = useState(
    suggestion.discovery_radius_meters ?? 15
  );
  const [pos, setPos] = useState<LatLng | null>({
    lat: suggestion.lat,
    lng: suggestion.lng,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const boundary =
    boards.find((b) => b.id === suggestion.board_id)?.boundary ?? null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Anna otsikko.");
    if (!description.trim()) return setError("Anna kuvaus.");
    if (!pos) return setError("Valitse sijainti.");

    setSaving(true);
    const { error: dbErr } = await supabase
      .from("story_suggestions")
      .update({
        title: title.trim(),
        description: description.trim(),
        category,
        xp_reward: xp,
        discovery_radius_meters: radius,
        lat: pos.lat,
        lng: pos.lng,
      })
      .eq("id", suggestion.id);
    setSaving(false);
    if (dbErr) {
      setError("Tallennus epäonnistui.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <h3 className="text-lg font-bold text-gold">Muokkaa ehdotusta</h3>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Otsikko
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
          maxLength={120}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Tarinateksti
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="field resize-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kategoria
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
                category === c.value
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-white/10 bg-ocean/40 text-cream/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-cream">
            XP
          </label>
          <input
            type="number"
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            className="field"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-cream">
            Löytösäde (m)
          </label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="field"
            min={1}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Sijainti
        </label>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            value={pos?.lat ?? ""}
            onChange={(e) =>
              setPos({ lat: Number(e.target.value), lng: pos?.lng ?? 0 })
            }
            placeholder="lat"
            className="field"
          />
          <input
            type="number"
            step="any"
            value={pos?.lng ?? ""}
            onChange={(e) =>
              setPos({ lat: pos?.lat ?? 0, lng: Number(e.target.value) })
            }
            placeholder="lng"
            className="field"
          />
        </div>
        <MapPicker boundary={boundary} value={pos} onPick={setPos} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-gold flex-1">
          {saving ? "Tallennetaan…" : "Tallenna"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/15 px-5 text-sm font-semibold text-cream/70 hover:text-cream"
        >
          Peruuta
        </button>
      </div>
    </form>
  );
}
