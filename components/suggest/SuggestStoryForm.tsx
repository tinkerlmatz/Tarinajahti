"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { pointInBoundary } from "@/lib/geo";
import type { StoryCategory } from "@/types/database";

type LatLng = { lat: number; lng: number };

const CATEGORIES: {
  value: StoryCategory;
  label: string;
  icon: string;
  defaultXp: number;
  info: string;
}[] = [
  {
    value: "historia",
    label: "Historia",
    icon: "📜",
    defaultXp: 15,
    info: "Todellinen tapahtuma tai historiallinen fakta joka liittyy tähän paikkaan. Esim. rakennuksen historia, merkittävä henkilö tai tapahtuma paikalla.",
  },
  {
    value: "legenda",
    label: "Legenda",
    icon: "⚡",
    defaultXp: 10,
    info: "Paikallinen tarina jonka todenperäisyys on epäselvä. Kaupunkihuhu, myyttinen tarina tai epävirallinen perimätieto.",
  },
  {
    value: "muisto",
    label: "Muisto",
    icon: "⏳",
    defaultXp: 5,
    info: "Merkittävä henkilökohtainen muisto joka liittyy juuri tähän paikkaan. Muiston tulee olla erityinen — ei arkipäiväinen kokemus vaan jotain ainutlaatuista: kosinta, lapsuuden tärkeä hetki, perheen perinne tms. Tavalliset arjen hetket eivät sovi tähän kategoriaan.",
  },
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

  const MAX_MEDIA = 3;
  const [category, setCategory] = useState<StoryCategory | null>(null);
  const [xp, setXp] = useState(10);
  const [openInfo, setOpenInfo] = useState<StoryCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);
  const [files, setFiles] = useState<File[]>([]);
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

    // Kuvien lataus Storageen (valinnainen, max 3).
    const imageUrls: string[] = [];
    for (const file of files.slice(0, MAX_MEDIA)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}-${imageUrls.length}.${ext}`;
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
      imageUrls.push(data.publicUrl);
    }

    const videos = videoUrls
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, MAX_MEDIA);

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
        xp_reward: xp,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        video_urls: videos.length > 0 ? videos : null,
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
              onClick={() => {
                setCategory(c.value);
                setXp(c.defaultXp);
              }}
              className={`relative flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors ${
                category === c.value
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-white/10 bg-ocean/40 text-cream/70 hover:border-gold/40"
              }`}
            >
              <span
                role="button"
                tabIndex={0}
                aria-label={`${c.label} – lisätietoa`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenInfo(openInfo === c.value ? null : c.value);
                }}
                className="absolute right-1.5 top-1.5 text-xs text-cream/40 hover:text-gold"
              >
                ⓘ
              </span>
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs font-semibold">{c.label}</span>
            </button>
          ))}
        </div>

        {openInfo && (
          <div className="mt-2 rounded-xl border border-gold/40 bg-ocean/60 p-3 text-xs leading-relaxed text-cream/80">
            <span className="font-semibold text-gold">
              {CATEGORIES.find((c) => c.value === openInfo)?.label}:{" "}
            </span>
            {CATEGORIES.find((c) => c.value === openInfo)?.info}
          </div>
        )}
      </div>

      {/* XP-pisteet (oletus kategorian mukaan) */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          XP-pisteet{" "}
          <span className="font-normal text-cream/50">
            (oletus luokan mukaan, admin voi muuttaa)
          </span>
        </label>
        <input
          type="number"
          min={0}
          value={xp}
          onChange={(e) => setXp(Number(e.target.value))}
          className="field"
        />
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

      {/* Kuvat (max 3) */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kuvat{" "}
          <span className="font-normal text-cream/50">
            (valinnainen, enintään {MAX_MEDIA})
          </span>
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []).slice(0, MAX_MEDIA);
            setFiles(picked);
          }}
          className="block w-full text-sm text-cream/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:font-semibold file:text-night"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-cream/50">
            {files.length} kuva{files.length === 1 ? "" : "a"} valittu
            {files.length >= MAX_MEDIA ? " (maksimi)" : ""}
          </p>
        )}
      </div>

      {/* Videolinkit (max 3) */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Videolinkit{" "}
          <span className="font-normal text-cream/50">
            (valinnainen, enintään {MAX_MEDIA})
          </span>
        </label>
        <div className="space-y-2">
          {videoUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  const next = [...videoUrls];
                  next[i] = e.target.value;
                  setVideoUrls(next);
                }}
                className="field flex-1"
                placeholder="https://youtube.com/…"
              />
              {videoUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setVideoUrls(videoUrls.filter((_, j) => j !== i))
                  }
                  aria-label="Poista"
                  className="shrink-0 rounded-lg border border-white/15 px-3 text-cream/60 hover:text-cream"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {videoUrls.length < MAX_MEDIA && (
          <button
            type="button"
            onClick={() => setVideoUrls([...videoUrls, ""])}
            className="mt-2 text-xs font-semibold text-gold hover:underline"
          >
            + Lisää videolinkki
          </button>
        )}
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
