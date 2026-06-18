"use client";

export type Summary = {
  walkKm: number;
  cycleKm: number;
  walkXp: number;
  cycleXp: number;
  storiesFound: number;
  storyXp: number;
  totalGained: number;
};

function km(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function storyWord(n: number): string {
  return n === 1 ? "1 tarinan" : `${n} tarinaa`;
}

export default function SessionSummary({
  summary,
  onClose,
}: {
  summary: Summary;
  onClose: () => void;
}) {
  const { walkKm, cycleKm, walkXp, cycleXp, storiesFound, storyXp, totalGained } =
    summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gold/60 bg-ocean p-6 text-center shadow-glow-lg">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-3 text-xl font-extrabold text-gold">Hieno jahti!</h2>

        <p className="mt-4 text-sm leading-relaxed text-cream/90">
          Kävelit <span className="font-semibold text-cream">{km(walkKm)} km</span>{" "}
          (+{walkXp} XP) ja pyöräilit{" "}
          <span className="font-semibold text-cream">{km(cycleKm)} km</span>{" "}
          (+{cycleXp} XP). Löysit{" "}
          <span className="font-semibold text-cream">{storyWord(storiesFound)}</span>{" "}
          (+{storyXp} XP).
        </p>

        <p className="mt-4 text-2xl font-extrabold text-gold">
          Yhteensä +{totalGained} XP!
        </p>

        <button onClick={onClose} className="btn-gold mt-6">
          Takaisin
        </button>
      </div>
    </div>
  );
}
