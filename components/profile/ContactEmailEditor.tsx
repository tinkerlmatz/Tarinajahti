"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Kevyt muototarkistus — riittää pilottiin (ei kata kaikkia reunatapauksia).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactEmailEditor({
  initialEmail,
  userId,
}: {
  initialEmail: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setValue(email);
    setError(null);
    setEditing(true);
  }

  async function save(newValue: string) {
    const clean = newValue.trim().toLowerCase();
    if (clean && !EMAIL_RE.test(clean)) {
      setError("Tarkista sähköpostiosoitteen muoto.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ contact_email: clean || null })
      .eq("id", userId);

    setSaving(false);
    if (updateError) {
      setError("Tallennus ei onnistunut, yritä uudelleen.");
      return;
    }

    setEmail(clean);
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="card space-y-2 p-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-gold/80">
        Sähköposti (vapaaehtoinen)
      </h2>
      <p className="text-xs leading-relaxed text-cream/60">
        Saat tiedon, jos voitat palkinnon. Voidaan käyttää myös salasanan
        palautukseen. Ei näy muille pelaajille.
      </p>

      {!editing ? (
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="min-w-0 truncate text-sm text-cream">
            {email || <span className="text-cream/40">Ei lisätty</span>}
          </span>
          <button
            onClick={startEdit}
            className="shrink-0 text-xs text-cream/50 underline-offset-2 transition-colors hover:text-gold hover:underline"
          >
            {email ? "Muokkaa" : "Lisää sähköposti"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="sinun@sahkoposti.fi"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="field"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={() => save(value)}
              disabled={saving}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              {saving ? "Tallennetaan…" : "Tallenna"}
            </button>
            {email && (
              <button
                onClick={() => {
                  setValue("");
                  save("");
                }}
                disabled={saving}
                className="text-sm text-red-400/80 transition-colors hover:text-red-400 disabled:opacity-50"
              >
                Poista
              </button>
            )}
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-cream/60 transition-colors hover:text-cream"
            >
              Peruuta
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
