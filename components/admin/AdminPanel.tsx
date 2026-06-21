"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StoryForm from "@/components/admin/StoryForm";
import SuggestionEditForm from "@/components/admin/SuggestionEditForm";
import type { GameBoard, Story, StorySuggestion } from "@/types/database";

type SuggestionWithName = StorySuggestion & { suggester_name: string };
type BoardWithCount = GameBoard & { story_count: number };

const XP_BONUS = 25;
const TABS = ["Tarinat", "Ehdotukset", "Alueet"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPanel({
  userId,
  boards,
  stories,
  suggestions,
}: {
  userId: string;
  boards: BoardWithCount[];
  stories: Story[];
  suggestions: SuggestionWithName[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("Tarinat");
  const [editing, setEditing] = useState<Story | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingSuggestion, setEditingSuggestion] =
    useState<SuggestionWithName | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    setAdding(false);
    setEditingSuggestion(null);
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
    // 1) Luo tarina ehdotuksesta.
    await supabase.from("stories").insert({
      board_id: s.board_id,
      category: s.category,
      title: s.title,
      content: s.description,
      lat: s.lat,
      lng: s.lng,
      xp_reward: s.xp_reward ?? XP_BONUS,
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
        .update({ total_xp: (prof.total_xp ?? 0) + XP_BONUS })
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-cream">{s.title}</p>
                    <p className="text-xs text-cream/50">
                      {s.category} · {s.xp_reward} XP · {s.lat.toFixed(4)},{" "}
                      {s.lng.toFixed(4)}
                    </p>
                  </div>
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
        <div className="space-y-3">
          {boards.map((b) => (
            <BoardEditor key={b.id} board={b} onSaved={() => router.refresh()} />
          ))}
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
  onSaved,
}: {
  board: BoardWithCount;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(toLocalInput(board.start_date));
  const [end, setEnd] = useState(toLocalInput(board.end_date));
  const [lootTitle, setLootTitle] = useState(board.loot_title ?? "");
  const [lootDesc, setLootDesc] = useState(board.loot_description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("game_boards")
      .update({
        start_date: start ? new Date(start).toISOString() : null,
        end_date: end ? new Date(end).toISOString() : null,
        loot_title: lootTitle.trim() || null,
        loot_description: lootDesc.trim() || null,
      })
      .eq("id", board.id);
    setSaving(false);
    setOpen(false);
    onSaved();
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-cream">{board.name}</p>
          <p className="text-xs text-cream/50">
            {board.story_count} tarinaa
            {board.loot_title ? ` · 🏆 ${board.loot_title}` : ""}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-gold/60 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10"
        >
          {open ? "Sulje" : "Muokkaa"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
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
          <button onClick={save} disabled={saving} className="btn-gold">
            {saving ? "Tallennetaan…" : "Tallenna"}
          </button>
        </div>
      )}
    </div>
  );
}
