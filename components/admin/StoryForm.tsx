"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { GameBoard, Story, StoryCategory } from "@/types/database";

const MapPicker = dynamic(() => import("@/components/suggest/MapPicker"), {
  ssr: false,
});

const CATEGORIES: { value: StoryCategory; label: string }[] = [
  { value: "historia", label: "Historia" },
  { value: "legenda", label: "Legenda" },
  { value: "muisto", label: "Muisto" },
];

type LatLng = { lat: number; lng: number };

export default function StoryForm({
  boards,
  story,
  userId,
  onDone,
  onCancel,
}: {
  boards: GameBoard[];
  story?: Story;
  userId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();

  const [boardId, setBoardId] = useState(story?.board_id ?? boards[0]?.id ?? "");
  const [category, setCategory] = useState<StoryCategory>(
    story?.category ?? "historia"
  );
  const [title, setTitle] = useState(story?.title ?? "");
  const [content, setContent] = useState(story?.content ?? "");
  const [xp, setXp] = useState(story?.xp_reward ?? 25);
  const [radius, setRadius] = useState(story?.discovery_radius_meters ?? 15);
  const [videoUrl, setVideoUrl] = useState(story?.video_url ?? "");
  const [externalLink, setExternalLink] = useState(story?.external_link ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pos, setPos] = useState<LatLng | null>(
    story ? { lat: story.lat, lng: story.lng } : null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const boundary = boards.find((b) => b.id === boardId)?.boundary ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!boardId) return setError("Valitse alue.");
    if (!title.trim()) return setError("Anna otsikko.");
    if (!content.trim()) return setError("Anna tarinateksti.");
    if (!pos) return setError("Valitse sijainti.");

    setSaving(true);

    let imageUrl = story?.image_url ?? null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("stories")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError("Kuvan lataus epäonnistui.");
        setSaving(false);
        return;
      }
      imageUrl = supabase.storage.from("stories").getPublicUrl(path).data
        .publicUrl;
    }

    const payload = {
      board_id: boardId,
      category,
      title: title.trim(),
      content: content.trim(),
      xp_reward: xp,
      discovery_radius_meters: radius,
      lat: pos.lat,
      lng: pos.lng,
      image_url: imageUrl,
      video_url: videoUrl.trim() || null,
      external_link: externalLink.trim() || null,
    };

    const { error: dbErr } = story
      ? await supabase.from("stories").update(payload).eq("id", story.id)
      : await supabase
          .from("stories")
          .insert({ ...payload, created_by: userId });

    setSaving(false);
    if (dbErr) {
      setError("Tallennus epäonnistui.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="text-lg font-bold text-gold">
        {story ? "Muokkaa tarinaa" : "Lisää uusi tarina"}
      </h3>

      <Field label="Alue">
        <select
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className="field"
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id} className="bg-ocean">
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tarinaluokka">
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
      </Field>

      <Field label="Otsikko">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
          maxLength={120}
        />
      </Field>

      <Field label="Tarinateksti">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="field resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="XP">
          <input
            type="number"
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            className="field"
            min={0}
          />
        </Field>
        <Field label="Löytösäde (m)">
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="field"
            min={1}
          />
        </Field>
      </div>

      <Field label="Kuva (valinnainen)">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-cream/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-semibold file:text-night"
        />
      </Field>

      <Field label="Videolinkki (valinnainen)">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="field"
        />
      </Field>

      <Field label="Linkki lisätietoihin (valinnainen)">
        <input
          type="url"
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
          className="field"
        />
      </Field>

      <Field label="Sijainti">
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
      </Field>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-cream">
        {label}
      </label>
      {children}
    </div>
  );
}
