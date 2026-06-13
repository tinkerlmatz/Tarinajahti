"use client";

import { useEffect, useState } from "react";

function format(target: number): string {
  const diff = target - Date.now();
  if (diff <= 0) return "Peli päättynyt";

  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  if (days > 0) return `${days} pv ${hours} h ${mins} min`;
  if (hours > 0) return `${hours} h ${mins} min ${secs} s`;
  return `${mins} min ${secs} s`;
}

export default function Countdown({ endDate }: { endDate: string }) {
  const target = new Date(endDate).getTime();
  const [label, setLabel] = useState(() => format(target));

  useEffect(() => {
    const id = setInterval(() => setLabel(format(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <span className="font-semibold tabular-nums text-gold">⏳ {label}</span>
  );
}
