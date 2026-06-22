"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/game-board",
    label: "Pelaa",
    icon: "/icons/nav-pelaa.svg",
    iconActive: "/icons/nav-pelaa-active.svg",
  },
  {
    href: "/leaderboard",
    label: "Tulokset",
    icon: "/icons/nav-tulokset.svg",
    iconActive: "/icons/nav-tulokset-active.svg",
  },
  {
    href: "/profile",
    label: "Profiili",
    icon: "/icons/nav-profiili.svg",
    iconActive: "/icons/nav-profiili-active.svg",
  },
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
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? "text-gold" : "text-cream/50 hover:text-cream/80"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active ? item.iconActive : item.icon}
                alt=""
                aria-hidden
                className="h-7 w-7"
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
