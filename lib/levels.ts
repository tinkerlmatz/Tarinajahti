export type Level = {
  level: number;
  title: string;
  min: number;
};

// 20 tasoa XP:n mukaan.
export const LEVELS: Level[] = [
  { level: 1, title: "Utelias Kulkija", min: 0 },
  { level: 2, title: "Polkujen Tutkija", min: 25 },
  { level: 3, title: "Tarinan Etsijä", min: 75 },
  { level: 4, title: "Lähieksploraattori", min: 150 },
  { level: 5, title: "Alueen Tuntija", min: 275 },
  { level: 6, title: "Kokenut Jahtaaja", min: 450 },
  { level: 7, title: "Tarinoiden Tuntija", min: 675 },
  { level: 8, title: "Lähilegenda", min: 1000 },
  { level: 9, title: "Kaupungin Varjo", min: 1400 },
  { level: 10, title: "Mestarijahtaaja", min: 1900 },
  { level: 11, title: "Tarinoiden Vartija", min: 2500 },
  { level: 12, title: "Kaupungin Tuntija", min: 3200 },
  { level: 13, title: "Kaupungin Konkari", min: 4000 },
  { level: 14, title: "Tarinoiden Mestari", min: 4900 },
  { level: 15, title: "Kaupungin Legenda", min: 5900 },
  { level: 16, title: "Suurjahtaaja", min: 7000 },
  { level: 17, title: "Tarinoiden Sankari", min: 8500 },
  { level: 18, title: "Kaupunkien Kulkija", min: 10000 },
  { level: 19, title: "Legendaarinen Etsijä", min: 12500 },
  { level: 20, title: "Tarinoiden Vartija — Mestari Kaikista", min: 15000 },
];

export type LevelInfo = {
  level: number;
  title: string;
  min: number;
  next: Level | null; // null jos maksimitaso
  xpToNext: number; // 0 jos maksimitaso
};

/** Palauttaa pelaajan tason XP:n perusteella + tieto seuraavasta tasosta. */
export function getLevel(xp: number): LevelInfo {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) current = l;
    else break;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  return {
    level: current.level,
    title: current.title,
    min: current.min,
    next,
    xpToNext: next ? next.min - xp : 0,
  };
}
