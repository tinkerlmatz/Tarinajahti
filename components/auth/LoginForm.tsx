"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail, usernameKey } from "@/lib/username";
import type { Gender } from "@/types/database";

type Mode = "signin" | "signup";

// Syntymävuosivalikon vaihtoehdot: nykyvuodesta taaksepäin.
const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: CURRENT_YEAR - 1920 + 1 },
  (_, i) => CURRENT_YEAR - i
);

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "mies", label: "Mies" },
  { value: "nainen", label: "Nainen" },
  { value: "muu", label: "Muu" },
  { value: "ei_kerro", label: "En halua kertoa" },
];

export default function LoginForm({
  initialMode = "signin",
}: {
  initialMode?: Mode;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  // Honeypot: näkymätön kenttä. Ihminen jättää tyhjäksi, botti täyttää.
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setError(null);
    setInfo(null);
  }

  async function ensureProfile(
    userId: string,
    name: string,
    birthYearValue: number,
    genderValue: Gender
  ) {
    await supabase.from("profiles").upsert(
      {
        id: userId,
        username: name,
        total_xp: 0,
        distance_walked_meters: 0,
        distance_cycled_meters: 0,
        tutorial_seen: false,
        birth_year: birthYearValue,
        gender: genderValue,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);

    // Honeypot: jos näkymätön kenttä on täytetty, kyseessä on lähes varmasti
    // botti. Keskeytetään hiljaisesti luomatta tiliä (ei paljasteta syytä).
    if (website.trim() !== "") {
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
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
      // Avaimen on sisällettävä kirjaimia/numeroita (ei pelkkiä väli-/erikoismerkkejä).
      if (usernameKey(name).length === 0) {
        setError("Valitse nimimerkki jossa on kirjaimia tai numeroita.");
        setLoading(false);
        return;
      }

      const year = Number(birthYear);
      if (!year) {
        setError("Valitse syntymävuosi.");
        setLoading(false);
        return;
      }
      if (!gender) {
        setError("Valitse sukupuoli.");
        setLoading(false);
        return;
      }

      // Onko näyttönimi jo käytössä?
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

      const { data, error } = await supabase.auth.signUp({
        email: usernameToEmail(name),
        password,
      });
      if (error) {
        setError(suomeksi(error.message));
        setLoading(false);
        return;
      }
      // Supabase palauttaa olemassa olevalle tilille näennäisen onnistumisen,
      // jossa identities on tyhjä → tulkitaan nimimerkki varatuksi.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("Nimimerkki on jo käytössä");
        setLoading(false);
        return;
      }
      if (data.session && data.user) {
        await ensureProfile(data.user.id, name, year, gender as Gender);
        router.push("/");
        router.refresh();
      } else {
        // Ei sessiota (esim. jos vahvistus olisi päällä) → ohjaa kirjautumaan.
        setInfo("Tili luotu. Kirjaudu sisään nimimerkilläsi ja salasanallasi.");
        setMode("signin");
        setLoading(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Honeypot: piilotettu botteja varten. Ei näy käyttäjälle eikä
          ruudunlukijalle, eikä ole tab-järjestyksessä. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
        }}
      />
      <div className="space-y-3">
        <input
          type="text"
          autoComplete="username"
          placeholder="Nimimerkki"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={20}
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
          <>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              required
              className={`field ${birthYear ? "" : "text-cream/40"}`}
            >
              <option value="" disabled className="bg-night text-cream/50">
                Syntymävuosi
              </option>
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y} className="bg-night text-cream">
                  {y}
                </option>
              ))}
            </select>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              className={`field ${gender ? "" : "text-cream/40"}`}
            >
              <option value="" disabled className="bg-night text-cream/50">
                Sukupuoli
              </option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value} className="bg-night text-cream">
                  {g.label}
                </option>
              ))}
            </select>
          </>
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
    return "Väärä nimimerkki tai salasana.";
  if (msg.includes("already registered"))
    return "Nimimerkki on jo käytössä";
  if (msg.includes("Password should be"))
    return "Salasanan tulee olla vähintään 6 merkkiä.";
  return msg;
}
