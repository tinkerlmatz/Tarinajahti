// Overpass-rajojen haku ja GeoJSON-yhdistäminen (selainpuoli).

export type LonLat = [number, number];

type OverpassMember = {
  type: string;
  role: string;
  geometry?: { lat: number; lon: number }[];
};

export type OverpassRelation = {
  id: number;
  tags: { name?: string; admin_level?: string };
  members: OverpassMember[];
};

export type MultiPolygon = {
  type: "MultiPolygon";
  coordinates: LonLat[][][];
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

async function runQuery(query: string): Promise<OverpassRelation[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = (await res.json()) as { elements: OverpassRelation[] };
  return json.elements.filter(
    (e) => (e as { type?: string }).type === "relation"
  );
}

/**
 * Hae kaupunginosan hallinnolliset rajat. Yritetään ensin admin_level 8–11,
 * ja jos ei tuloksia, ilman admin_level-rajausta.
 */
export async function fetchRelations(
  name: string
): Promise<OverpassRelation[]> {
  const withLevel = `
[out:json];
(
  relation["name"="${name}"]["boundary"="administrative"]["admin_level"~"^(8|9|10|11)$"];
);
out geom;`;

  let rels = await runQuery(withLevel);
  if (rels.length > 0) return rels;

  // Fallback: ilman admin_level-rajausta.
  const noLevel = `
[out:json];
(
  relation["name"="${name}"]["boundary"="administrative"];
);
out geom;`;
  rels = await runQuery(noLevel);
  return rels;
}

function coordEq(a: LonLat, b: LonLat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Yhdistä ulkokehän way-pätkät suljetuiksi renkaiksi. */
export function stitchRings(rel: OverpassRelation): LonLat[][] {
  const segments: LonLat[][] = rel.members
    .filter(
      (m) =>
        m.type === "way" && (m.role === "outer" || m.role === "") && m.geometry
    )
    .map((m) => m.geometry!.map((p) => [p.lon, p.lat] as LonLat));

  const rings: LonLat[][] = [];
  while (segments.length > 0) {
    let ring = segments.shift()!;
    let extended = true;
    while (!coordEq(ring[0], ring[ring.length - 1]) && extended) {
      extended = false;
      const tail = ring[ring.length - 1];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (coordEq(tail, seg[0])) ring = ring.concat(seg.slice(1));
        else if (coordEq(tail, seg[seg.length - 1]))
          ring = ring.concat([...seg].reverse().slice(1));
        else if (coordEq(ring[0], seg[seg.length - 1]))
          ring = seg.slice(0, -1).concat(ring);
        else if (coordEq(ring[0], seg[0]))
          ring = [...seg].reverse().slice(0, -1).concat(ring);
        else continue;
        segments.splice(i, 1);
        extended = true;
        break;
      }
    }
    if (!coordEq(ring[0], ring[ring.length - 1])) ring.push(ring[0]);
    rings.push(ring);
  }
  return rings;
}

/** Relaatio → polygonit (jokainen ulkorengas oma polygoni). */
export function relationToPolygons(rel: OverpassRelation): LonLat[][][] {
  return stitchRings(rel).map((ring) => [ring]);
}

/** Yhdistä useat polygonijoukot yhdeksi MultiPolygoniksi. */
export function combineToMultiPolygon(
  polygonGroups: LonLat[][][][]
): MultiPolygon {
  const coordinates: LonLat[][][] = [];
  for (const group of polygonGroups) {
    for (const poly of group) coordinates.push(poly);
  }
  return { type: "MultiPolygon", coordinates };
}

/** Bounding boxin keskipiste. */
export function centerOf(mp: MultiPolygon): { lat: number; lng: number } {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const poly of mp.coordinates)
    for (const ring of poly)
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}
