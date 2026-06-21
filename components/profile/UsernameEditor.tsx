"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAME_RE = /^[A-Za-z0-9ÄÖÅäöå _-]+$/;

export default function UsernameEditor({
  initialUsername,
  userId,
}: {
  initialUsername: string;
  userId: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialUsername);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setValue(username);
    setError(null);
    setEditing(true);
  }

  async function save() {
    const name = value.trim();
    if (name.length < 3 || name.length > 20) {
      setError("Nimen tulee olla 3–20 merkkiä.");
      return;
    }
    if (!NAME_RE.test(name)) {
      setError("Ei erikoismerkkejä — vain kirjaimet, numerot, väli, - ja _.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    // Tarkista onko nimi jo käytössä toisella käyttäjällä.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", name)
      .neq("id", userId)
      .maybeSingle();

    if (existing) {
      setError("Nimi on jo käytössä, valitse toinen.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: name })
      .eq("id", userId);

    setSaving(false);
    if (updateError) {
      // esim. unique-constraint kilpatilanteessa
      setError("Nimi on jo käytössä, valitse toinen.");
      return;
    }

    setUsername(name);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-extrabold text-cream">{username}</h1>
        <button
          onClick={startEdit}
          className="text-xs text-cream/50 underline-offset-2 transition-colors hover:text-gold hover:underline"
        >
          Vaihda nimeä
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={20}
        autoFocus
        className="field text-center"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {saving ? "Tallennetaan…" : "Tallenna"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-sm text-cream/60 transition-colors hover:text-cream"
        >
          Peruuta
        </button>
      </div>
    </div>
  );
}
