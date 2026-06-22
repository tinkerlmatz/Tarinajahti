"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchRelations,
  relationToPolygons,
  combineToMultiPolygon,
  centerOf,
  type LonLat,
  type MultiPolygon,
} from "@/lib/overpass";
import BoundaryPreview from "@/components/admin/BoundaryPreview";

const MAX_NEIGHBORHOODS = 5;
// Oletuskeskipiste jos rajoja ei haeta (säädettävissä myöhemmin).
const DEFAULT_CENTER = { lat: 65.0, lng: 25.47 };

type Option = { id: number; label: string; polygons: LonLat[][][] };
type Result = { neighborhood: string; options: Option[]; selectedId: number | null };

export default function CreateBoardForm({
  prefill,
  onDone,
  onCancel,
}: {
  prefill?: { name?: string; city?: string; neighborhoods?: string[] };
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();

  const [neighborhoods, setNeighborhoods] = useState<string[]>(
    prefill?.neighborhoods?.length ? prefill.neighborhoods : [""]
  );
  const [name, setName] = useState(prefill?.name ?? "");
  const [city, setCity] = useState(prefill?.city ?? "");
  const [description, setDescription] = useState("");
  const nameEdited = useRef(Boolean(prefill?.name));

  const [results, setResults] = useState<Result[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [boundary, setBoundary] = useState<MultiPolygon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ehdota nimi kaupunginosista jos adminilla ei ole omaa nimeä.
  useEffect(() => {
    if (nameEdited.current) return;
    const auto = neighborhoods.map((n) => n.trim()).filter(Boolean).join("–");
    setName(auto);
  }, [neighborhoods]);

  // Esikatselurajat valituista vaihtoehdoista.
  const previewMP: MultiPolygon | null = results
    ? (() => {
        const groups = results
          .map((r) => r.options.find((o) => o.id === r.selectedId)?.polygons)
          .filter((p): p is LonLat[][][] => Boolean(p));
        return groups.length > 0 ? combineToMultiPolygon(groups) : null;
      })()
    : null;

  function setNeighborhood(i: number, value: string) {
    setNeighborhoods((prev) => prev.map((n, j) => (j === i ? value : n)));
  }

  async function fetchBoundaries() {
    const names = neighborhoods.map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      setError("Lisää vähintään yksi kaupunginosa.");
      return;
    }
    setFetching(true);
    setError(null);
    setInfo(null);
    try {
      const res: Result[] = [];
      for (const n of names) {
        const rels = await fetchRelations(n);
        const options: Option[] = rels.map((r) => ({
          id: r.id,
          label: `${r.tags.name ?? n} (taso ${r.tags.admin_level}, id ${r.id})`,
          polygons: relationToPolygons(r),
        }));
        res.push({
          neighborhood: n,
          options,
          selectedId: options[0]?.id ?? null,
        });
      }
      setResults(res);
      const anyFound = res.some((r) => r.options.length > 0);
      if (!anyFound) {
        setInfo(
          "Rajoja ei löytynyt automaattisesti. Voit lisätä alueen ilman rajoja ja päivittää ne myöhemmin."
        );
      }
    } catch {
      setInfo(
        "Rajojen haku epäonnistui. Voit lisätä alueen ilman rajoja ja päivittää ne myöhemmin."
      );
    } finally {
      setFetching(false);
    }
  }

  function selectOption(neighborhood: string, id: number) {
    setResults(
      (prev) =>
        prev?.map((r) =>
          r.neighborhood === neighborhood ? { ...r, selectedId: id } : r
        ) ?? null
    );
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Anna alueen nimi.");
    if (!city.trim()) return setError("Anna kaupunki.");

    setSaving(true);
    const center = boundary ? centerOf(boundary) : DEFAULT_CENTER;
    const { error: dbErr } = await supabase.from("game_boards").insert({
      name: name.trim(),
      city: city.trim(),
      description: description.trim() || null,
      boundary: boundary,
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: 2000,
      start_date: null,
      end_date: null,
    });
    setSaving(false);
    if (dbErr) {
      setError("Tallennus epäonnistui.");
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gold">Luo uusi alue</h3>

      {/* Kaupunginosat */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kaupunginosat / kylät
        </label>
        <div className="space-y-2">
          {neighborhoods.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={n}
                onChange={(e) => setNeighborhood(i, e.target.value)}
                placeholder={`Kaupunginosa / kylä ${i + 1}`}
                className="field flex-1"
              />
              {neighborhoods.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setNeighborhoods(neighborhoods.filter((_, j) => j !== i))
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
        {neighborhoods.length < MAX_NEIGHBORHOODS && (
          <button
            type="button"
            onClick={() => setNeighborhoods([...neighborhoods, ""])}
            className="mt-2 text-xs font-semibold text-gold hover:underline"
          >
            + Lisää kaupunginosa
          </button>
        )}
      </div>

      {/* Nimi */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Alueen nimi
        </label>
        <input
          value={name}
          onChange={(e) => {
            nameEdited.current = true;
            setName(e.target.value);
          }}
          className="field"
        />
      </div>

      {/* Kaupunki */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kaupunki
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="field"
        />
      </div>

      {/* Kuvaus */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-cream">
          Kuvaus
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="field resize-none"
        />
      </div>

      {/* Rajojen haku */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-ocean/30 p-4">
        <button
          type="button"
          onClick={fetchBoundaries}
          disabled={fetching}
          className="w-full rounded-lg border border-gold/60 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {fetching ? "Haetaan rajoja…" : "Hae rajat automaattisesti"}
        </button>

        {info && <p className="text-xs text-cream/70">{info}</p>}

        {/* Useita tuloksia → valinta */}
        {results?.map(
          (r) =>
            r.options.length > 1 && (
              <div key={r.neighborhood} className="text-xs text-cream/80">
                <p className="mb-1 font-semibold">{r.neighborhood} — valitse:</p>
                {r.options.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 py-0.5">
                    <input
                      type="radio"
                      name={`opt-${r.neighborhood}`}
                      checked={r.selectedId === o.id}
                      onChange={() => selectOption(r.neighborhood, o.id)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            )
        )}

        {previewMP && (
          <>
            <BoundaryPreview boundary={previewMP} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBoundary(previewMP)}
                className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-night hover:bg-gold-light"
              >
                Hyväksy rajat
              </button>
              <button
                type="button"
                onClick={() => setBoundary(null)}
                className="flex-1 rounded-lg border border-white/15 py-2 text-sm font-semibold text-cream/70 hover:text-cream"
              >
                Ohita rajat
              </button>
            </div>
            {boundary && (
              <p className="text-center text-xs text-gold">✓ Rajat hyväksytty</p>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-gold flex-1">
          {saving ? "Tallennetaan…" : "Luo alue"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/15 px-5 text-sm font-semibold text-cream/70 hover:text-cream"
        >
          Peruuta
        </button>
      </div>
    </div>
  );
}
