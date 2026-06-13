/**
 * Tarinajahti-logo: kultainen nelisakarainen tähti + wordmark.
 * Tähti hehkuu hienovaraisesti (twinkle-animaatio).
 */

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f7ca6b" />
          <stop offset="100%" stopColor="#F4B942" />
        </radialGradient>
      </defs>
      {/* nelisakarainen kiiltotähti */}
      <path
        d="M50 2 L58 42 L98 50 L58 58 L50 98 L42 58 L2 50 L42 42 Z"
        fill="url(#starGlow)"
      />
    </svg>
  );
}

export default function Logo({
  size = "lg",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-5xl" : size === "md" ? "text-3xl" : "text-2xl";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative">
        <Star className="h-12 w-12 animate-twinkle drop-shadow-[0_0_12px_rgba(244,185,66,0.6)]" />
        {/* pieni sivutähti */}
        <Star className="absolute -right-3 top-0 h-4 w-4 animate-twinkle opacity-80 [animation-delay:0.8s]" />
      </div>
      <h1 className={`${text} font-extrabold tracking-tight text-cream`}>
        Tarina
        <span className="relative">
          jahti
          {/* kultainen tähti i:n pisteenä */}
          <Star className="absolute -top-1 right-[1.15em] h-2.5 w-2.5 animate-twinkle" />
        </span>
      </h1>
    </div>
  );
}
