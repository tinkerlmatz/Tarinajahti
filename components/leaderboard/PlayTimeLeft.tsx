"use client";

import { useEffect, useState } from "react";

function format(target: number): string {
  const diff = target - Date.now();
  if (diff <= 0) return "Peli on päättynyt";
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  return `Peliaikaa vielä ${days} päivää ${hours} tuntia`;
}

export default function PlayTimeLeft({ endDate }: { endDate: string }) {
  const target = new Date(endDate).getTime();
  const [label, setLabel] = useState(() => format(target));

  useEffect(() => {
    const id = setInterval(() => setLabel(format(target)), 60000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <p className="text-sm font-semibold text-gold">⏳ {label}</p>
  );
}
