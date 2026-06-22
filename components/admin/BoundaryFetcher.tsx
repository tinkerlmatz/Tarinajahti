"use client";

import { useState } from "react";
import {
  fetchAreaCandidates,
  combineToMultiPolygon,
  centerOf,
  type LonLat,
  type MultiPolygon,
  type FetchStage,
} from "@/lib/overpass";
import BoundaryPreview from "@/components/admin/BoundaryPreview";

const MAX_NEIGHBORHOODS = 5;

type Option = { id: number; label: string; polygons: LonLat[][][] };
type Result = { neighborhood: string; options: Option[]; selectedId: number | null };

/**
 * Rajojen haku Overpassista, esikatselu ja hyväksyntä.
 * Kutsuu onAccept-funktiota yhdistetyllä MultiPolygonilla + keskipisteellä.
 */
export default function BoundaryFetcher({
  initialNeighborhoods,
  onAccept,
}: {
  initialNeighborhoods?: string[];
  onAccept: (mp: MultiPolygon, center: { lat: number; lng: number }) => void;
}) {
  const [neighborhoods, setNeighborhoods] = useState<string[]>(
    initialNeighborhoods?.length ? initialNeighborhoods : [""]
  );
  const [results, setResults] = useState<Result[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const previewMP: MultiPolygon | null = results
    ? (() => {
        const groups = results
          .map((r) => r.options.find((o) => o.id === r.selectedId)?.polygons)
          .filter((p): p is LonLat[][][] => Boolean(p));
        return groups.length > 0 ? combineToMultiPolygon(groups) : null;
      })()
    : null;

  async function fetchBoundaries() {
    const names = neighborhoods.map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setFetching(true);
    setIssues([]);
    setInfo(null);
    setAccepted(false);

    const stageLabel: Record<FetchStage, string> = {
      boundary: "boundary",
      place: "place",
      node: "node",
    };

    try {
      const res: Result[] = [];
      const problems: string[] = [];
      for (const n of names) {
        const r = await fetchAreaCandidates(n, (s) =>
          setStatus(`Haetaan ${n} (${stageLabel[s]})…`)
        );
        if (r.candidates.length === 0) {
          problems.push(
            r.nodeOnly
              ? `${n} löytyi kartalta mutta sillä ei ole alueen rajoja OSM:ssä.`
              : `Ei löydetty: ${n}. Kokeile eri kirjoitusasua.`
          );
        }
        res.push({
          neighborhood: n,
          options: r.candidates,
          selectedId: r.candidates[0]?.id ?? null,
        });
      }
      setResults(res);
      setIssues(problems);
      setStatus(null);
      if (!res.some((r) => r.options.length > 0)) {
        setInfo("Rajoja ei löytynyt automaattisesti.");
      }
    } catch (err) {
      setStatus(`Virhe: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-night/40 p-4">
      <div className="space-y-2">
        {neighborhoods.map((n, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={n}
              onChange={(e) =>
                setNeighborhoods((prev) =>
                  prev.map((x, j) => (j === i ? e.target.value : x))
                )
              }
              placeholder={`Kaupunginosa / kylä ${i + 1}`}
              className="field flex-1"
            />
            {neighborhoods.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setNeighborhoods(neighborhoods.filter((_, j) => j !== i))
                }
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
          className="text-xs font-semibold text-gold hover:underline"
        >
          + Lisää kaupunginosa
        </button>
      )}

      <button
        type="button"
        onClick={fetchBoundaries}
        disabled={fetching}
        className="w-full rounded-lg border border-gold/60 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
      >
        {fetching ? "Haetaan rajoja…" : "Hae rajat automaattisesti"}
      </button>

      {status && <p className="text-xs text-gold">{status}</p>}
      {info && <p className="text-xs text-cream/70">{info}</p>}
      {issues.map((m, i) => (
        <p key={i} className="text-xs text-red-400">
          {m}
        </p>
      ))}

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
                    onChange={() =>
                      setResults(
                        (prev) =>
                          prev?.map((x) =>
                            x.neighborhood === r.neighborhood
                              ? { ...x, selectedId: o.id }
                              : x
                          ) ?? null
                      )
                    }
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
          <button
            type="button"
            onClick={() => {
              onAccept(previewMP, centerOf(previewMP));
              setAccepted(true);
            }}
            className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-night hover:bg-gold-light"
          >
            Hyväksy rajat
          </button>
          {accepted && (
            <p className="text-center text-xs text-gold">✓ Rajat hyväksytty</p>
          )}
        </>
      )}
    </div>
  );
}
