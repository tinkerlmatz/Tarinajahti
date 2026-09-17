"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type {
  GameBoard,
  Story,
  StoryCategory,
  StoryObjectType,
  SourceBasis,
} from "@/types/database";

const MapPicker = dynamic(() => import("@/components/suggest/MapPicker"), {
  ssr: false,
});

const CATEGORIES: { value: StoryCategory; label: string }[] = [
  { value: "historia", label: "Historia" },
  { value: "legenda", label: "Legenda" },
  { value: "muisto", label: "Muisto" },
  { value: "mysteeri", label: "Mysteeri" },
];

const OBJECT_TYPES: { value: StoryObjectType; label: string }[] = [
  { value: "paikka", label: "Paikka" },
  { value: "rakennus", label: "Rakennus/rakennelma" },
  { value: "henkilo", label: "Henkilö" },
  { value: "tapahtuma", label: "Tapahtuma" },
  { value: "luontokohde", label: "Luontokohde" },
  { value: "reitti", label: "Reitti" },
  { value: "yhteiso", label: "Yhteisö" },
];

// Kontrolloitu teemasanasto (slug -> näyttönimi). Vapaa teksti poistettu:
// yhtenäiset arvot pitävät kustomoitujen pelien suodatuksen ehjänä.
const THEMES: { value: string; label: string }[] = [
  { value: "urheilu_liikunta", label: "Urheilu & liikunta" },
  { value: "luonto_ymparisto", label: "Luonto & ympäristö" },
  { value: "rakennukset_arkkitehtuuri", label: "Rakennukset & arkkitehtuuri" },
  { value: "liikenne_kulkeminen", label: "Liikenne & kulkeminen" },
  { value: "sota_konfliktit", label: "Sota & konfliktit" },
  { value: "tyo_elinkeinot", label: "Työ & elinkeinot" },
  { value: "tekniikka_infrastruktuuri", label: "Tekniikka & infrastruktuuri" },
  { value: "koulutus", label: "Koulutus" },
  { value: "kulttuuri", label: "Kulttuuri" },
  { value: "musiikki", label: "Musiikki" },
  { value: "kirjallisuus", label: "Kirjallisuus" },
  { value: "yhteisot_yhdistykset", label: "Yhteisöt & yhdistykset" },
  { value: "lapset_nuoret", label: "Lapset & nuoret" },
  { value: "vapaa_aika_harrastukset", label: "Vapaa-aika & harrastukset" },
  { value: "ruoka_juoma", label: "Ruoka & juoma" },
  { value: "uskonto_kirkko", label: "Uskonto & kirkko" },
  { value: "terveys_hyvinvointi", label: "Terveys & hyvinvointi" },
  { value: "hallinto_yhteiskunta", label: "Hallinto & yhteiskunta" },
  { value: "kauppa_palvelut", label: "Kauppa & palvelut" },
  { value: "taide", label: "Taide" },
];

const MOODS: { value: string; label: string }[] = [
  { value: "hauska", label: "Hauska" },
  { value: "jannittava", label: "Jännittävä" },
  { value: "mystinen", label: "Mystinen" },
  { value: "koskettava", label: "Koskettava" },
  { value: "yllattava", label: "Yllättävä" },
  { value: "nostalginen", label: "Nostalginen" },
];

const SOURCE_BASES: { value: SourceBasis; label: string }[] = [
  { value: "dokumentoitu", label: "Dokumentoitu" },
  { value: "muistitieto", label: "Muistitieto" },
  { value: "perimatieto", label: "Perimätieto" },
  { value: "tulkinta", label: "Tulkinta" },
  { value: "huhu", label: "Tarina/huhu" },
];

const AGES: { value: number; label: string }[] = [
  { value: 0, label: "Kaikille" },
  { value: 7, label: "7+" },
  { value: 12, label: "12+" },
  { value: 16, label: "16+" },
];

type LatLng = { lat: number; lng: number };

// Esitäyttö ehdotuksesta (hyväksyntä avaa lomakkeen näillä arvoilla).
export type StoryPrefill = {
  board_id?: string;
  category?: StoryCategory;
  title?: string;
  content?: string;
  xp_reward?: number;
  lat?: number;
  lng?: number;
  image_url?: string | null;
  video_url?: string | null;
  external_link?: string | null;
};

export default function StoryForm({
  boards,
  story,
  prefill,
  userId,
  afterSave,
  onDone,
  onCancel,
}: {
  boards: GameBoard[];
  story?: Story;
  prefill?: StoryPrefill;
  userId: string;
  // Ajetaan onnistuneen tallennuksen jälkeen (esim. merkitse ehdotus
  // hyväksytyksi + anna XP-bonus). Virhe tässä ei estä tarinan luontia.
  afterSave?: () => Promise<void> | void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();

  // Olemassa oleva kuva: muokkauksessa tarinasta, hyväksynnässä ehdotuksesta.
  const existingImage = story?.image_url ?? prefill?.image_url ?? null;

  const [boardId, setBoardId] = useState(
    story?.board_id ?? prefill?.board_id ?? boards[0]?.id ?? ""
  );
  const [category, setCategory] = useState<StoryCategory>(
    story?.category ?? prefill?.category ?? "historia"
  );
  const [title, setTitle] = useState(story?.title ?? prefill?.title ?? "");
  const [content, setContent] = useState(
    story?.content ?? prefill?.content ?? ""
  );
  const [xp, setXp] = useState(story?.xp_reward ?? prefill?.xp_reward ?? 25);
  const [radius, setRadius] = useState(story?.discovery_radius_meters ?? 15);
  const [videoUrl, setVideoUrl] = useState(
    story?.video_url ?? prefill?.video_url ?? ""
  );
  const [externalLink, setExternalLink] = useState(
    story?.external_link ?? prefill?.external_link ?? ""
  );
  const [teaser, setTeaser] = useState(story?.teaser ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [pos, setPos] = useState<LatLng | null>(
    story
      ? { lat: story.lat, lng: story.lng }
      : prefill?.lat != null && prefill?.lng != null
      ? { lat: prefill.lat, lng: prefill.lng }
      : null
  );

  // --- Rikastuskentät ---
  const [objectType, setObjectType] = useState<StoryObjectType | "">(
    story?.object_type ?? ""
  );
  const [themes, setThemes] = useState<string[]>(story?.themes ?? []);
  const [yearStart, setYearStart] = useState(
    story?.year_start != null ? String(story.year_start) : ""
  );
  const [yearEnd, setYearEnd] = useState(
    story?.year_end != null ? String(story.year_end) : ""
  );
  const [minAge, setMinAge] = useState<number>(story?.min_age ?? 0);
  const [moods, setMoods] = useState<string[]>(story?.moods ?? []);
  const [sourceBasis, setSourceBasis] = useState<string[]>(
    story?.source_basis ?? []
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const boundary = boards.find((b) => b.id === boardId)?.boundary ?? null;

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((x) => x !== value)
      : [...list, value];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!boardId) return setError("Valitse alue.");
    if (!title.trim()) return setError("Anna otsikko.");
    if (!content.trim()) return setError("Anna tarinateksti.");
    if (!pos) return setError("Valitse sijainti.");

    const ys = yearStart.trim() === "" ? null : Number(yearStart);
    const ye = yearEnd.trim() === "" ? null : Number(yearEnd);
    if (ys != null && ye != null && ys > ye) {
      return setError("Alkuvuosi ei voi olla loppuvuotta suurempi.");
    }

    setSaving(true);

    let imageUrl = existingImage;
    if (removeImage) imageUrl = null;
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
      teaser: teaser.trim() || null,
      object_type: objectType || null,
      themes,
      year_start: ys,
      year_end: ye,
      min_age: minAge,
      moods,
      source_basis: sourceBasis as SourceBasis[],
    };

    const { error: dbErr } = story
      ? await supabase.from("stories").update(payload).eq("id", story.id)
      : await supabase
          .from("stories")
          .insert({ ...payload, created_by: userId });

    if (dbErr) {
      setSaving(false);
      setError("Tallennus epäonnistui.");
      return;
    }
    // Viimeistely (esim. ehdotuksen hyväksyntä + bonus) tallennuksen jälkeen.
    if (afterSave) await afterSave();
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="text-lg font-bold text-gold">
        {story
          ? "Muokkaa tarinaa"
          : prefill
          ? "Hyväksy ja rikasta ehdotus"
          : "Lisää uusi tarina"}
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
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              on={category === c.value}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Chip>
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
        {existingImage && !removeImage && !file ? (
          <div className="mb-2 flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingImage}
              alt=""
              className="max-h-[120px] max-w-[120px] rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => setRemoveImage(true)}
              aria-label="Poista kuva"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              ✕
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-cream/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-semibold file:text-night"
          />
        )}
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

      <Field label="Houkutteluteksti (teaser)">
        <input
          type="text"
          value={teaser}
          onChange={(e) => setTeaser(e.target.value)}
          maxLength={100}
          className="field"
          placeholder="Esim. Kärppälegendan jäljillä…"
        />
        <p className="mt-1 text-xs text-cream/50">
          Lyhyt innostava teksti joka näkyy pelaajalle ennen tarinan löytymistä.
        </p>
      </Field>

      {/* --- Rikastus (suodatusta ja kustomoituja pelejä varten) --- */}
      <div className="rounded-xl border border-white/10 bg-ocean/20 p-3 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gold/70">
          Luokittelu &amp; rikastus
        </p>

        <Field label="Kohdetyyppi">
          <div className="flex flex-wrap gap-2">
            {OBJECT_TYPES.map((o) => (
              <Chip
                key={o.value}
                on={objectType === o.value}
                onClick={() =>
                  setObjectType(objectType === o.value ? "" : o.value)
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Teemat (voit valita useita)">
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <Chip
                key={t.value}
                on={themes.includes(t.value)}
                onClick={() => setThemes(toggle(themes, t.value))}
                pill
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Ajankohta (vuosiväli, valinnainen)">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              placeholder="Alkuvuosi"
              className="field"
            />
            <input
              type="number"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              placeholder="Loppuvuosi"
              className="field"
            />
          </div>
          <p className="mt-1 text-xs text-cream/50">
            Esihistoria = negatiivinen vuosi. Jätä tyhjäksi jos ajankohta on
            epämääräinen.
          </p>
        </Field>

        <Field label="Suositusikä">
          <div className="grid grid-cols-4 gap-2">
            {AGES.map((a) => (
              <Chip
                key={a.value}
                on={minAge === a.value}
                onClick={() => setMinAge(a.value)}
              >
                {a.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Tunnelma (voit valita useita)">
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <Chip
                key={m.value}
                on={moods.includes(m.value)}
                onClick={() => setMoods(toggle(moods, m.value))}
                pill
              >
                {m.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Lähdepohja (voit valita useita)">
          <div className="flex flex-wrap gap-2">
            {SOURCE_BASES.map((s) => (
              <Chip
                key={s.value}
                on={sourceBasis.includes(s.value)}
                onClick={() => setSourceBasis(toggle(sourceBasis, s.value))}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

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
          {saving
            ? "Tallennetaan…"
            : prefill
            ? "Hyväksy ja tallenna"
            : "Tallenna"}
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

function Chip({
  on,
  onClick,
  children,
  pill,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  pill?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${
        pill ? "rounded-full px-3 py-1 text-xs" : "rounded-lg py-2 text-sm"
      } border font-semibold transition-colors ${
        pill ? "" : "px-2"
      } ${
        on
          ? "border-gold bg-gold/15 text-gold"
          : "border-white/10 bg-ocean/40 text-cream/70 hover:border-gold/40"
      }`}
    >
      {children}
    </button>
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
