"use client";

// Pilotin bugiraportointi: avaa käyttäjän oman sähköpostisovelluksen
// valmiiksi täytetyllä viestillä. Ei lähetä mitään automaattisesti.
const BUG_EMAIL = "timo.perala@navico.fi";

export default function ReportBugButton({ boardName }: { boardName?: string }) {
  function openMail() {
    const subject = `Tarinajahti – bugiraportti${
      boardName ? ` (${boardName})` : ""
    }`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const body = [
      "Kuvaile mitä tapahtui (ja mielellään mitä teit juuri ennen bugia):",
      "",
      "",
      "———",
      "Älä poista alla olevia teknisiä tietoja – ne auttavat korjaamaan bugin:",
      `Sivu: ${url}`,
      `Selain: ${ua}`,
      `Aika: ${new Date().toISOString()}`,
    ].join("\n");

    const href = `mailto:${BUG_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  return (
    <button
      type="button"
      onClick={openMail}
      className="mt-2 block w-full rounded-xl border border-white/15 py-2 text-center text-sm font-semibold text-cream/70 transition-colors hover:bg-white/5 hover:text-cream"
    >
      🐞 Raportoi bugi
    </button>
  );
}
