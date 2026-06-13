"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/game-board", icon: "🗺️", label: "Pelaa" },
  { href: "/leaderboard", icon: "🏆", label: "Tulokset" },
  { href: "/profile", icon: "👤", label: "Profiili" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-white/10 bg-ocean/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-md">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-gold" : "text-cream/50 hover:text-cream/80"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
