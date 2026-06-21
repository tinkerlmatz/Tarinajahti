"use client";

import type { Story } from "@/types/database";

const CATEGORY_LABEL: Record<string, string> = {
  historia: "Historia",
  legenda: "Legenda",
  muisto: "Muisto",
};

const CATEGORY_ICON: Record<string, string> = {
  historia: "📜",
  legenda: "⚡",
  muisto: "⏳",
};

export default function StoryModal({
  story,
  xp,
  onContinue,
  onEnd,
}: {
  story: Story;
  xp: number;
  onContinue: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gold/60 bg-ocean shadow-glow-lg">
        <div className="bg-gold/15 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gold">
              {CATEGORY_ICON[story.category] ?? "✨"}{" "}
              {CATEGORY_LABEL[story.category] ?? story.category}
            </span>
            <span className="rounded-full bg-gold px-3 py-1 text-sm font-extrabold text-night">
              +{xp} XP!
            </span>
          </div>
          <h2 className="mt-2 text-xl font-extrabold text-cream">
            {story.title}
          </h2>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-5">
          {story.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.image_url}
              alt=""
              className="mb-4 w-full rounded-xl object-cover"
            />
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/90">
            {story.content}
          </p>

          {(story.external_link || story.video_url) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {story.external_link && (
                <a
                  href={story.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gold/60 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
                >
                  Lue lisää
                </a>
              )}
              {story.video_url && (
                <a
                  href={story.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gold/60 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
                >
                  Katso video
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 px-5 pb-5">
          <button onClick={onContinue} className="btn-gold">
            Jatka jahtia
          </button>
          <button
            onClick={onEnd}
            className="w-full rounded-xl border border-white/20 py-3 text-sm font-semibold text-cream/80 transition-colors hover:border-white/40 hover:text-cream"
          >
            Lopeta jahti
          </button>
        </div>
      </div>
    </div>
  );
}
