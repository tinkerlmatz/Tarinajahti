"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setError(null);
    setInfo(null);
  }

  async function ensureProfile(userId: string, name: string) {
    await supabase.from("profiles").upsert(
      {
        id: userId,
        username: name,
        total_xp: 0,
        distance_walked_meters: 0,
        distance_cycled_meters: 0,
        tutorial_seen: false,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(suomeksi(error.message));
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const name = username.trim();

      // Nimimerkin validointi.
      if (name.length < 3 || name.length > 20) {
        setError("Nimimerkin tulee olla 3–20 merkkiä.");
        setLoading(false);
        return;
      }
      if (!/^[A-Za-z0-9ÄÖÅäöå _-]+$/.test(name)) {
        setError("Nimimerkissä ei saa olla erikoismerkkejä.");
        setLoading(false);
        return;
      }

      // Onko nimimerkki jo käytössä?
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", name)
        .maybeSingle();
      if (taken) {
        setError("Nimimerkki on jo käytössä");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(suomeksi(error.message));
        setLoading(false);
        return;
      }
      if (data.session && data.user) {
        // Sähköpostivahvistus pois päältä → suora kirjautuminen
        await ensureProfile(data.user.id, name);
        router.push("/");
        router.refresh();
      } else {
        setInfo("Tarkista sähköpostisi ja vahvista tilisi linkistä.");
        setLoading(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Sähköposti"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="field"
        />
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="Salasana"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="field"
        />
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Nimimerkki"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            className="field"
          />
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}
      {info && (
        <p className="text-center text-sm text-gold">{info}</p>
      )}

      <button type="submit" disabled={loading} className="btn-gold">
        {loading
          ? "Hetki…"
          : mode === "signin"
          ? "Kirjaudu sisään"
          : "Luo tili"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          reset();
        }}
        className="btn-ghost"
      >
        {mode === "signin"
          ? "Ei tiliä? Luo uusi tili"
          : "Onko jo tili? Kirjaudu sisään"}
      </button>
    </form>
  );
}

// Käännetään yleisimmät Supabase-virheet suomeksi
function suomeksi(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Väärä sähköposti tai salasana.";
  if (msg.includes("already registered"))
    return "Tili tällä sähköpostilla on jo olemassa.";
  if (msg.includes("Password should be"))
    return "Salasanan tulee olla vähintään 6 merkkiä.";
  return msg;
}
