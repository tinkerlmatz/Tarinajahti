/**
 * Hakee Oulunsuun ja Knuutilan kaupunginosarajat Overpass API:sta,
 * yhdistää ne yhdeksi GeoJSON MultiPolygoniksi, laskee keskipisteen ja
 * päivittää tiedot game_boards-tauluun.
 *
 * Aja:
 *   npx tsx scripts/update-boundary.ts
 *
 * Vaatii .env.local-tiedostosta:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (kirjoitukseen — RLS estää anon-avaimen)
 *
 * Ilman service-avainta skripti tulostaa GeoJSONin ja keskipisteen, mutta
 * ei kirjoita kantaan.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BOARD_ID = "e1a236f2-4403-406c-85ce-738495a5025d"; // Oulunsuu–Knuutila
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const OVERPASS_QUERY = `
[out:json];
(
  relation["name"="Oulunsuu"]["boundary"="administrative"];
  relation["name"="Knuutila"]["boundary"="administrative"];
);
out geom;
`;

type LonLat = [number, number];

type OverpassMember = {
  type: string;
  role: string;
  geometry?: { lat: number; lon: number }[];
};

type OverpassRelation = {
  id: number;
  tags: { name?: string; admin_level?: string };
  members: OverpassMember[];
};

// --- .env.local lukeminen ---
function loadEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  const env: Record<string, string> = {};
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // ei tiedostoa — käytetään process.env:iä
  }
  return { ...env, ...process.env } as Record<string, string>;
}

// --- Overpass-haku ---
async function fetchRelations(): Promise<OverpassRelation[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Tarinajahti/1.0 (boundary import script)",
    },
    body: "data=" + encodeURIComponent(OVERPASS_QUERY),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { elements: OverpassRelation[] };
  return json.elements.filter((e) => (e as { type?: string }).type === "relation");
}

// --- Renkaiden yhdistäminen: ulkokehän way-pätkät yhteen suljettuun rengasketjuun ---
function coordEq(a: LonLat, b: LonLat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function stitchRings(rel: OverpassRelation): LonLat[][] {
  // Kerää ulkokehän (outer) way-pätkät [lon,lat]-listoiksi.
  const segments: LonLat[][] = rel.members
    .filter((m) => m.type === "way" && (m.role === "outer" || m.role === "") && m.geometry)
    .map((m) => m.geometry!.map((p) => [p.lon, p.lat] as LonLat));

  const rings: LonLat[][] = [];

  while (segments.length > 0) {
    let ring = segments.shift()!;

    // Yhdistä pätkiä kunnes rengas sulkeutuu.
    let extended = true;
    while (!coordEq(ring[0], ring[ring.length - 1]) && extended) {
      extended = false;
      const tail = ring[ring.length - 1];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (coordEq(tail, seg[0])) {
          ring = ring.concat(seg.slice(1));
        } else if (coordEq(tail, seg[seg.length - 1])) {
          ring = ring.concat([...seg].reverse().slice(1));
        } else if (coordEq(ring[0], seg[seg.length - 1])) {
          ring = seg.slice(0, -1).concat(ring);
        } else if (coordEq(ring[0], seg[0])) {
          ring = [...seg].reverse().slice(0, -1).concat(ring);
        } else {
          continue;
        }
        segments.splice(i, 1);
        extended = true;
        break;
      }
    }

    // Varmista sulkeutuminen.
    if (!coordEq(ring[0], ring[ring.length - 1])) ring.push(ring[0]);
    rings.push(ring);
  }

  return rings;
}

function main() {
  const env = loadEnv();

  fetchRelations().then((relations) => {
    console.log(
      "Haetut relaatiot:",
      relations.map((r) => `${r.tags.name} (admin_level=${r.tags.admin_level}, id=${r.id})`)
    );

    // Valitse kustakin nimestä kaupunginosataso (admin_level=10).
    const byName = new Map<string, OverpassRelation>();
    for (const rel of relations) {
      const name = rel.tags.name ?? String(rel.id);
      const existing = byName.get(name);
      if (!existing || rel.tags.admin_level === "10") byName.set(name, rel);
    }

    // Rakenna MultiPolygon: jokainen ulkorengas omaksi polygoniksi.
    const polygons: LonLat[][][] = [];
    for (const rel of byName.values()) {
      for (const ring of stitchRings(rel)) {
        polygons.push([ring]);
      }
    }

    const multiPolygon = { type: "MultiPolygon" as const, coordinates: polygons };

    // Keskipiste = bounding boxin keskikohta.
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const poly of polygons)
      for (const ring of poly)
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;

    // Koko boundary-kenttään menevä JSON-merkkijono (kopioitavaksi).
    console.log("\n===== BOUNDARY JSON ALKAA =====");
    console.log(JSON.stringify(multiPolygon));
    console.log("===== BOUNDARY JSON LOPPUU =====\n");

    console.log(`Polygoneja: ${polygons.length}`);
    console.log(`Kärkipisteitä yhteensä: ${polygons.reduce((s, p) => s + p[0].length, 0)}`);
    console.log(`Keskipiste: lat=${centerLat.toFixed(6)}, lng=${centerLng.toFixed(6)}`);
    console.log(`Bounding box: [${minLng.toFixed(4)}, ${minLat.toFixed(4)}] - [${maxLng.toFixed(4)}, ${maxLat.toFixed(4)}]`);

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      console.log(
        "\n⚠️  SUPABASE_SERVICE_ROLE_KEY puuttuu .env.local:sta — kantaa EI päivitetty."
      );
      console.log(
        "Lisää avain ja aja uudelleen. (RLS estää kirjoituksen anon-avaimella.)"
      );
      console.log("\nGeoJSON-esikatselu (ensimmäiset 200 merkkiä):");
      console.log(JSON.stringify(multiPolygon).slice(0, 200) + "…");
      return;
    }

    const supabase = createClient(url, serviceKey);
    supabase
      .from("game_boards")
      .update({
        boundary: multiPolygon,
        center_lat: centerLat,
        center_lng: centerLng,
      })
      .eq("id", BOARD_ID)
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error("❌ Päivitys epäonnistui:", error.message);
          process.exit(1);
        }
        console.log(`\n✅ game_boards päivitetty (${data?.length ?? 0} rivi).`);
      });
  }).catch((err) => {
    console.error("❌ Virhe:", err.message);
    process.exit(1);
  });
}

main();
