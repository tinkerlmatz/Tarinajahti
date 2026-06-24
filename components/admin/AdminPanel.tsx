"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StoryForm from "@/components/admin/StoryForm";
import SuggestionEditForm from "@/components/admin/SuggestionEditForm";
import CreateBoardForm from "@/components/admin/CreateBoardForm";
import BoundaryFetcher from "@/components/admin/BoundaryFetcher";
import BoundaryPreview from "@/components/admin/BoundaryPreview";
import type { GameBoard, Story, StorySuggestion } from "@/types/database";
import type { MultiPolygon } from "@/lib/overpass";

type OpenArea = { areaName: string; city: string; count: number };
type Standing = { id: string; username: string; xp: number };

type SuggestionWithName = StorySuggestion & { suggester_name: string };
type BoardWithCount = GameBoard & { story_count: number };

// Ehdottajan XP-bonus kategorian mukaan, kun ehdotus hyväksytään.
const BONUS_BY_CATEGORY: Record<string, number> = {
  muisto: 5,
  legenda: 10,
  historia: 15,
};
const TABS = ["Tarinat", "Ehdotukset", "Alueet"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPanel({
  userId,
  boards,
  stories,
  suggestions,
  openAreas,
  standings,
}: {
  userId: string;
  boards: BoardWithCount[];
  stories: Story[];
  suggestions: SuggestionWithName[];
  openAreas: OpenArea[];
  standings: Record<string, Standing[]>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("Tarinat");
  const [editing, setEditing] = useState<Story | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingSuggestion, setEditingSuggestion] =
    useState<SuggestionWithName | null>(null);
  const [creatingBoard, setCreatingBoard] = useState<{
    name?: string;
    city?: string;
    neighborhoods?: string[];
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    setAdding(false);
    setEditingSuggestion(null);
    setCreatingBoard(null);
    router.refresh();
  }

  async function deleteStory(id: string) {
    if (!confirm("Poistetaanko tarina?")) return;
    setBusy(id);
    await supabase.from("stories").delete().eq("id", id);
    setBusy(null);
    router.refresh();
  }

  async function approve(s: SuggestionWithName) {
    setBusy(s.id);
    const bonus = BONUS_BY_CATEGORY[s.category] ?? 5;
    // 1) Luo tarina ehdotuksesta. Tarinan oma xp_reward = kategorian oletus
    //    (admin voi muokata sitä jälkikäteen tarinan muokkauslomakkeesta).
    await supabase.from("stories").insert({
      board_id: s.board_id,
      category: s.category,
      title: s.title,
      content: s.description,
      lat: s.lat,
      lng: s.lng,
      xp_reward: bonus,
      discovery_radius_meters: s.discovery_radius_meters ?? 15,
      image_url: s.image_urls?.[0] ?? s.image_url ?? null,
      video_url: s.video_urls?.[0] ?? s.video_url ?? null,
      created_by: s.suggested_by,
    });
    // 2) Merkitse hyväksytyksi.
    await supabase
      .from("story_suggestions")
      .update({ status: "approved", xp_bonus_given: true })
      .eq("id", s.id);
    // 3) XP-bonus ehdottajalle.
    const { data: prof } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", s.suggested_by)
      .single();
    if (prof) {
      await supabase
        .from("profiles")
        .update({ total_xp: (prof.total_xp ?? 0) + bonus })
        .eq("id", s.suggested_by);
    }
    setBusy(null);
    router.refresh();
  }

  async function reject(id: string) {
    setBusy(id);
    await supabase
      .from("story_suggestions")
      .update({ status: "rejected" })
      .eq("id", id);
    setBusy(null);
    router.refresh();
  }

  if (adding || editing) {
    return (
      <StoryForm
        boards={boards}
        story={editing ?? undefined}
        userId={userId}
        onDone={refresh}
        onCancel={() => {
          setEditing(null);
          setAdding(false);
        }}
      />
    );
  }

  if (editingSuggestion) {
    return (
      <SuggestionEditForm
        suggestion={editingSuggestion}
        boards={boards}
        onDone={refresh}
        onCancel={() => setEditingSuggestion(null)}
      />
    );
  }

  if (creatingBoard) {
    return (
      <CreateBoardForm
        prefill={creatingBoard}
        onDone={refresh}
        onCancel={() => setCreatingBoard(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Välilehdet */}
      <div className="flex rounded-xl border border-white/10 bg-ocean/40 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-gold text-night" : "text-cream/70"
            }`}
          >
            {t}
            {t === "Ehdotukset" && suggestions.length > 0 && (
              <span className="ml-1 text-xs">({suggestions.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* TARINAT */}
      {tab === "Tarinat" && (
        <div className="space-y-3">
          <button onClick={() => setAdding(true)} className="btn-gold">
            Lisää uusi tarina
          </button>
          {stories.length === 0 ? (
            <p className="text-sm text-cream/60">Ei tarinoita.</p>
          ) : (
            stories.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-cream">{s.title}</p>
                    <p className="text-xs text-cream/50">
                      {s.category} · {s.xp_reward} XP · {s.lat.toFixed(4)},{" "}
                      {s.lng.toFixed(4)}
                    </p>
                  </div>
                  {s.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-night/60 text-xl text-cream/40">
                      🖼️
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditing(s)}
                    className="rounded-lg border border-gold/60 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10"
                  >
                    Muokkaa
                  </button>
                  <button
                    onClick={() => deleteStory(s.id)}
                    disabled={busy === s.id}
                    className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Poista
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EHDOTUKSET */}
      {tab === "Ehdotukset" && (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-cream/60">Ei avoimia ehdotuksia.</p>
          ) : (
            suggestions.map((s) => {
              const images = s.image_urls ?? (s.image_url ? [s.image_url] : []);
              const videos = s.video_urls ?? (s.video_url ? [s.video_url] : []);
              return (
                <div key={s.id} className="card p-4">
                  <p className="font-bold text-cream">{s.title}</p>
                  <p className="text-xs text-cream/50">
                    {s.category} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)} ·{" "}
                    {s.suggester_name}
                  </p>
                  <p className="mt-2 text-sm text-cream/80">{s.description}</p>

                  {images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {images.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {videos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {videos.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gold underline"
                        >
                          Video {i + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => approve(s)}
                      disabled={busy === s.id}
                      className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-night hover:bg-gold-light disabled:opacity-50"
                    >
                      Hyväksy
                    </button>
                    <button
                      onClick={() => setEditingSuggestion(s)}
                      disabled={busy === s.id}
                      className="flex-1 rounded-lg border border-gold/60 py-2 text-sm font-semibold text-gold hover:bg-gold/10 disabled:opacity-50"
                    >
                      Muokkaa
                    </button>
                    <button
                      onClick={() => reject(s.id)}
                      disabled={busy === s.id}
                      className="flex-1 rounded-lg border border-red-500/50 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Hylkää
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ALUEET */}
      {tab === "Alueet" && (
        <div className="space-y-4">
          <button onClick={() => setCreatingBoard({})} className="btn-gold">
            Luo uusi alue
          </button>

          {/* Avoimet alue-ehdotukset (>=10, ei vielä aluetta) */}
          {openAreas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gold/80">
                Avoimet alue-ehdotukset
              </h3>
              {openAreas.map((a) => (
                <div
                  key={`${a.areaName}|${a.city}`}
                  className="card flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-cream">
                      {a.areaName}
                      <span className="font-normal text-cream/50">
                        , {a.city}
                      </span>
                    </p>
                    <p className="text-xs text-cream/50">{a.count} ehdotusta</p>
                  </div>
                  <button
                    onClick={() =>
                      setCreatingBoard({
                        name: a.areaName,
                        city: a.city,
                        neighborhoods: [a.areaName],
                      })
                    }
                    className="shrink-0 rounded-lg bg-gold/90 px-3 py-1.5 text-xs font-bold text-night hover:bg-gold"
                  >
                    Luo alue tästä
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Olemassa olevat alueet */}
          <div className="space-y-3">
            {boards.map((b) => (
              <BoardEditor
                key={b.id}
                board={b}
                standings={standings[b.id] ?? []}
                onSaved={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function BoardEditor({
  board,
  standings,
  onSaved,
}: {
  board: BoardWithCount;
  standings: Standing[];
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const ended =
    !!board.end_date && new Date(board.end_date).getTime() <= Date.now();
  const [city, setCity] = useState(board.city ?? "");
  const [start, setStart] = useState(toLocalInput(board.start_date));
  const [end, setEnd] = useState(toLocalInput(board.end_date));
  const [lootTitle, setLootTitle] = useState(board.loot_title ?? "");
  const [lootDesc, setLootDesc] = useState(board.loot_description ?? "");
  const [newBoundary, setNewBoundary] = useState<{
    boundary: MultiPolygon;
    center: { lat: number; lng: number };
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("game_boards")
      .update({
        city: city.trim() || null,
        start_date: start ? new Date(start).toISOString() : null,
        end_date: end ? new Date(end).toISOString() : null,
        loot_title: lootTitle.trim() || null,
        loot_description: lootDesc.trim() || null,
        ...(newBoundary
          ? {
              boundary: newBoundary.boundary,
              center_lat: newBoundary.center.lat,
              center_lng: newBoundary.center.lng,
            }
          : {}),
      })
      .eq("id", board.id);
    setSaving(false);
    setOpen(false);
    onSaved();
  }

  async function remove() {
    if (
      !confirm(
        `Haluatko varmasti poistaa alueen ${board.name}? Tämä ei poista alueen tarinoita.`
      )
    )
      return;
    setDeleting(true);
    await supabase.from("game_boards").delete().eq("id", board.id);
    setDeleting(false);
    onSaved();
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-cream">
            {board.name}
            {board.city ? `, ${board.city}` : ""}
          </p>
          <p className="text-xs text-cream/50">
            {board.story_count} tarinaa
            {board.loot_title ? ` · 🏆 ${board.loot_title}` : ""}
            {board.is_finished ? " · ✓ päätetty" : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg border border-gold/60 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10"
          >
            {open ? "Sulje" : "Muokkaa"}
          </button>
          <button
            onClick={remove}
            disabled={deleting}
            className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            Poista
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-cream">
            Kaupunki
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-semibold text-cream">
            Alkaa
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-semibold text-cream">
            Päättyy
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-semibold text-cream">
            Palkinnon nimi
            <input
              value={lootTitle}
              onChange={(e) => setLootTitle(e.target.value)}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-semibold text-cream">
            Palkinnon kuvaus
            <textarea
              value={lootDesc}
              onChange={(e) => setLootDesc(e.target.value)}
              rows={2}
              className="field mt-1 resize-none"
            />
          </label>
          {/* Rajat */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-cream">Alueen rajat</p>
            {newBoundary ? (
              <p className="text-xs text-gold">
                ✓ Uudet rajat haettu — tallenna ottaaksesi käyttöön.
              </p>
            ) : board.boundary ? (
              <BoundaryPreview boundary={board.boundary} />
            ) : (
              <p className="text-xs text-cream/50">Rajoja ei ole asetettu.</p>
            )}
            <BoundaryFetcher
              initialNeighborhoods={board.name.split("–").map((s) => s.trim())}
              onAccept={(boundary, center) =>
                setNewBoundary({ boundary, center })
              }
            />
          </div>

          <button onClick={save} disabled={saving} className="btn-gold">
            {saving ? "Tallennetaan…" : "Tallenna"}
          </button>
        </div>
      )}

      {/* Pelin päättäminen (päättyneet, ei vielä päätetyt) */}
      {ended && !board.is_finished && (
        <button
          onClick={() => setFinishing(true)}
          className="mt-3 w-full rounded-xl border border-gold bg-gold/10 py-2.5 text-sm font-bold text-gold transition-colors hover:bg-gold/20"
        >
          Päätä peli ja jaa palkinnot
        </button>
      )}

      {finishing && (
        <FinishGameModal
          board={board}
          standings={standings}
          onClose={() => setFinishing(false)}
          onDone={onSaved}
        />
      )}
    </div>
  );
}

function defaultSeason(endDate: string | null): string {
  const d = endDate ? new Date(endDate) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

function FinishGameModal({
  board,
  standings,
  onClose,
  onDone,
}: {
  board: BoardWithCount;
  standings: Standing[];
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = createClient();
  const top3 = standings.slice(0, 3);
  const [season, setSeason] = useState(defaultSeason(board.end_date));
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    if (top3.length > 0) {
      await supabase.from("achievements").insert(
        top3.map((p, i) => ({
          user_id: p.id,
          board_id: board.id,
          rank: i + 1,
          season,
        }))
      );
    }
    await supabase
      .from("game_boards")
      .update({ is_finished: true })
      .eq("id", board.id);
    setSaving(false);
    onClose();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gold/60 bg-ocean p-6">
        <h3 className="text-lg font-extrabold text-gold">Päätä peli</h3>
        <p className="mt-1 text-sm text-cream/70">{board.name}</p>

        <div className="mt-4 space-y-2">
          {top3.length === 0 ? (
            <p className="text-sm text-cream/60">
              Ei pelaajia — palkintoja ei jaeta.
            </p>
          ) : (
            top3.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-night/50 px-3 py-2 text-sm"
              >
                <span className="text-cream">
                  {["🥇", "🥈", "🥉"][i]} {p.username}
                </span>
                <span className="font-bold text-gold">{p.xp} XP</span>
              </div>
            ))
          )}
        </div>

        <label className="mt-4 block text-sm font-semibold text-cream">
          Kausi
          <input
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="field mt-1"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button onClick={confirm} disabled={saving} className="btn-gold flex-1">
            {saving ? "Jaetaan…" : "Vahvista ja jaa palkinnot"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 text-sm font-semibold text-cream/70 hover:text-cream"
          >
            Peruuta
          </button>
        </div>
      </div>
    </div>
  );
}
