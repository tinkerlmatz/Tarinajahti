"use client";

/**
 * Kompassigrafiikka (kompassi.svg React-komponenttina).
 * Neula (#needle) kääntyy `rotation`-propilla — pehmeä transition SVG:ssä.
 */
export default function Compass({
  rotation,
  dim = false,
}: {
  rotation: number;
  dim?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-22 -22 344 344"
      className="h-auto w-full"
    >
      <defs>
        <radialGradient id="kompFace" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#1c3a5c" />
          <stop offset="70%" stopColor="#102338" />
          <stop offset="100%" stopColor="#0a1827" />
        </radialGradient>
        <linearGradient id="kompRing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe49c" />
          <stop offset="35%" stopColor="#F4B942" />
          <stop offset="65%" stopColor="#c8902a" />
          <stop offset="100%" stopColor="#f3cf72" />
        </linearGradient>
        <linearGradient id="kompNeedleN" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe49c" />
          <stop offset="100%" stopColor="#F4B942" />
        </linearGradient>
        <radialGradient id="kompHub" cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffe49c" />
          <stop offset="55%" stopColor="#F4B942" />
          <stop offset="100%" stopColor="#a9741f" />
        </radialGradient>
        <filter id="kompShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#kompShadow)">
        <circle cx="150" cy="150" r="146" fill="url(#kompRing)" />
        <circle cx="150" cy="150" r="146" fill="none" stroke="#7d5618" strokeWidth="1.5" />
        <circle cx="150" cy="150" r="130" fill="#0a1827" />
        <circle cx="150" cy="150" r="124" fill="url(#kompFace)" />
        <circle cx="150" cy="150" r="124" fill="none" stroke="#F4B942" strokeWidth="1" opacity=".35" />
        <g fill="#0a1827" opacity=".55">
          <circle cx="150" cy="11" r="3" />
          <circle cx="289" cy="150" r="3" />
          <circle cx="150" cy="289" r="3" />
          <circle cx="11" cy="150" r="3" />
          <circle cx="248" cy="52" r="2.4" />
          <circle cx="248" cy="248" r="2.4" />
          <circle cx="52" cy="248" r="2.4" />
          <circle cx="52" cy="52" r="2.4" />
        </g>
        <g stroke="#F4B942">
          {TICKS.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={t.w}
              opacity={t.o}
            />
          ))}
        </g>
        <g opacity=".5">
          <polygon points="150,150 178,122 150,52" fill="#c8902a" />
          <polygon points="150,150 178,178 248,150" fill="#a9741f" />
          <polygon points="150,150 122,178 150,248" fill="#c8902a" />
          <polygon points="150,150 122,122 52,150" fill="#a9741f" />
        </g>
        <polygon points="150,150 168,132 150,30" fill="#ffe49c" />
        <polygon points="150,150 132,132 150,30" fill="#F4B942" />
        <polygon points="150,150 168,168 270,150" fill="#c8902a" />
        <polygon points="150,150 168,132 270,150" fill="#e0a838" />
        <polygon points="150,150 132,168 150,270" fill="#c8902a" />
        <polygon points="150,150 168,168 150,270" fill="#e0a838" />
        <polygon points="150,150 132,132 30,150" fill="#e0a838" />
        <polygon points="150,150 132,168 30,150" fill="#c8902a" />
        <circle cx="150" cy="150" r="58" fill="none" stroke="#F4B942" strokeWidth="1" opacity=".4" />
      </g>

      {/* Neula — kääntyy rotation-propilla */}
      <g
        id="needle"
        transform={`rotate(${rotation} 150 150)`}
        style={{
          transition: "transform .5s cubic-bezier(.34,1.4,.5,1)",
          opacity: dim ? 0.3 : 1,
        }}
      >
        <g filter="url(#kompShadow)">
          {/* Valkoinen/hopea pää = vastakkainen suunta (kapeampi, lyhyempi) */}
          <polygon points="150,150 158,150 150,238" fill="#e9eef5" />
          <polygon points="150,150 142,150 150,238" fill="#aeb9c7" />

          {/* Kultainen pää = kohteen suunta (leveämpi varsi + iso nuolenpää) */}
          <polygon points="150,150 162,150 150,70" fill="url(#kompNeedleN)" />
          <polygon points="150,150 138,150 150,70" fill="#c8902a" />
          {/* Iso selkeä nuolenpää kärkeen */}
          <polygon points="150,22 173,78 150,66 127,78" fill="url(#kompNeedleN)" stroke="#7d5618" strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points="150,22 150,66 127,78" fill="#c8902a" opacity=".55" />
        </g>
        <circle cx="150" cy="150" r="13" fill="url(#kompHub)" stroke="#7d5618" strokeWidth="1.5" />
        <circle cx="150" cy="150" r="4.5" fill="#0a1827" />
      </g>
    </svg>
  );
}

// Kompassin asteikkomerkit (säilytetty alkuperäisestä SVG:stä).
const TICKS = [
  { x1: 150.0, y1: 30.0, x2: 150.0, y2: 44.0, w: 2.4, o: 0.95 },
  { x1: 165.7, y1: 31.0, x2: 164.9, y2: 37.0, w: 0.8, o: 0.35 },
  { x1: 181.1, y1: 34.1, x2: 179.5, y2: 39.9, w: 0.8, o: 0.35 },
  { x1: 195.9, y1: 39.1, x2: 192.5, y2: 47.4, w: 1.4, o: 0.6 },
  { x1: 210.0, y1: 46.1, x2: 207.0, y2: 51.3, w: 0.8, o: 0.35 },
  { x1: 223.1, y1: 54.8, x2: 219.4, y2: 59.6, w: 0.8, o: 0.35 },
  { x1: 234.9, y1: 65.1, x2: 225.0, y2: 75.0, w: 2.4, o: 0.95 },
  { x1: 245.2, y1: 76.9, x2: 240.4, y2: 80.6, w: 0.8, o: 0.35 },
  { x1: 253.9, y1: 90.0, x2: 248.7, y2: 93.0, w: 0.8, o: 0.35 },
  { x1: 260.9, y1: 104.1, x2: 252.6, y2: 107.5, w: 1.4, o: 0.6 },
  { x1: 265.9, y1: 118.9, x2: 260.1, y2: 120.5, w: 0.8, o: 0.35 },
  { x1: 269.0, y1: 134.3, x2: 263.0, y2: 135.1, w: 0.8, o: 0.35 },
  { x1: 270.0, y1: 150.0, x2: 256.0, y2: 150.0, w: 2.4, o: 0.95 },
  { x1: 269.0, y1: 165.7, x2: 263.0, y2: 164.9, w: 0.8, o: 0.35 },
  { x1: 265.9, y1: 181.1, x2: 260.1, y2: 179.5, w: 0.8, o: 0.35 },
  { x1: 260.9, y1: 195.9, x2: 252.6, y2: 192.5, w: 1.4, o: 0.6 },
  { x1: 253.9, y1: 210.0, x2: 248.7, y2: 207.0, w: 0.8, o: 0.35 },
  { x1: 245.2, y1: 223.1, x2: 240.4, y2: 219.4, w: 0.8, o: 0.35 },
  { x1: 234.9, y1: 234.9, x2: 225.0, y2: 225.0, w: 2.4, o: 0.95 },
  { x1: 223.1, y1: 245.2, x2: 219.4, y2: 240.4, w: 0.8, o: 0.35 },
  { x1: 210.0, y1: 253.9, x2: 207.0, y2: 248.7, w: 0.8, o: 0.35 },
  { x1: 195.9, y1: 260.9, x2: 192.5, y2: 252.6, w: 1.4, o: 0.6 },
  { x1: 181.1, y1: 265.9, x2: 179.5, y2: 260.1, w: 0.8, o: 0.35 },
  { x1: 165.7, y1: 269.0, x2: 164.9, y2: 263.0, w: 0.8, o: 0.35 },
  { x1: 150.0, y1: 270.0, x2: 150.0, y2: 256.0, w: 2.4, o: 0.95 },
  { x1: 134.3, y1: 269.0, x2: 135.1, y2: 263.0, w: 0.8, o: 0.35 },
  { x1: 118.9, y1: 265.9, x2: 120.5, y2: 260.1, w: 0.8, o: 0.35 },
  { x1: 104.1, y1: 260.9, x2: 107.5, y2: 252.6, w: 1.4, o: 0.6 },
  { x1: 90.0, y1: 253.9, x2: 93.0, y2: 248.7, w: 0.8, o: 0.35 },
  { x1: 76.9, y1: 245.2, x2: 80.6, y2: 240.4, w: 0.8, o: 0.35 },
  { x1: 65.1, y1: 234.9, x2: 75.0, y2: 225.0, w: 2.4, o: 0.95 },
  { x1: 54.8, y1: 223.1, x2: 59.6, y2: 219.4, w: 0.8, o: 0.35 },
  { x1: 46.1, y1: 210.0, x2: 51.3, y2: 207.0, w: 0.8, o: 0.35 },
  { x1: 39.1, y1: 195.9, x2: 47.4, y2: 192.5, w: 1.4, o: 0.6 },
  { x1: 34.1, y1: 181.1, x2: 39.9, y2: 179.5, w: 0.8, o: 0.35 },
  { x1: 31.0, y1: 165.7, x2: 37.0, y2: 164.9, w: 0.8, o: 0.35 },
  { x1: 30.0, y1: 150.0, x2: 44.0, y2: 150.0, w: 2.4, o: 0.95 },
  { x1: 31.0, y1: 134.3, x2: 37.0, y2: 135.1, w: 0.8, o: 0.35 },
  { x1: 34.1, y1: 118.9, x2: 39.9, y2: 120.5, w: 0.8, o: 0.35 },
  { x1: 39.1, y1: 104.1, x2: 47.4, y2: 107.5, w: 1.4, o: 0.6 },
  { x1: 46.1, y1: 90.0, x2: 51.3, y2: 93.0, w: 0.8, o: 0.35 },
  { x1: 54.8, y1: 76.9, x2: 59.6, y2: 80.6, w: 0.8, o: 0.35 },
  { x1: 65.1, y1: 65.1, x2: 75.0, y2: 75.0, w: 2.4, o: 0.95 },
  { x1: 76.9, y1: 54.8, x2: 80.6, y2: 59.6, w: 0.8, o: 0.35 },
  { x1: 90.0, y1: 46.1, x2: 93.0, y2: 51.3, w: 0.8, o: 0.35 },
  { x1: 104.1, y1: 39.1, x2: 107.5, y2: 47.4, w: 1.4, o: 0.6 },
  { x1: 118.9, y1: 34.1, x2: 120.5, y2: 39.9, w: 0.8, o: 0.35 },
  { x1: 134.3, y1: 31.0, x2: 135.1, y2: 37.0, w: 0.8, o: 0.35 },
];
