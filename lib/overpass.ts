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

type OverpassElement = {
  type: "relation" | "way" | "node";
  id: number;
  tags?: { name?: string; admin_level?: string; place?: string };
  members?: OverpassMember[];
  geometry?: { lat: number; lon: number }[];
};

export type MultiPolygon = {
  type: "MultiPolygon";
  coordinates: LonLat[][][];
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const FETCH_TIMEOUT_MS = 10000;

async function runQuery(query: string): Promise<OverpassElement[]> {
  let lastError: unknown = null;
  let timedOutCount = 0;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const url = endpoint + "?data=" + encodeURIComponent(query);
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        mode: "cors",
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = new Error(`${endpoint}: HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { elements: OverpassElement[] };
      return json.elements ?? [];
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        timedOutCount += 1;
        lastError = new Error(`${endpoint}: aikakatkaisu`);
      } else {
        lastError = e;
      }
      // kokeile seuraavaa endpointtia
    } finally {
      clearTimeout(timeout);
    }
  }

  if (timedOutCount === OVERPASS_ENDPOINTS.length) {
    throw new Error(
      "Overpass API ei vastaa juuri nyt. Yritä hetken kuluttua uudelleen tai lisää alue ilman rajoja."
    );
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Kaikki Overpass-endpointit epäonnistuivat");
}

/** Muunna Overpass-elementti polygoneiksi (relaatio tai way). */
function elementToPolygons(el: OverpassElement): LonLat[][][] {
  if (el.type === "relation" && el.members) {
    return relationToPolygons(el as OverpassRelation);
  }
  if (el.type === "way" && el.geometry && el.geometry.length >= 3) {
    const ring = el.geometry.map((p) => [p.lon, p.lat] as LonLat);
    if (
      ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1]
    ) {
      ring.push(ring[0]);
    }
    return [[ring]];
  }
  return [];
}

export type AreaCandidate = {
  id: number;
  label: string;
  polygons: LonLat[][][];
};

export type AreaFetchResult = {
  candidates: AreaCandidate[];
  nodeOnly: boolean;
};

export type FetchStage = "boundary" | "place" | "node";

function toCandidates(name: string, els: OverpassElement[]): AreaCandidate[] {
  return els
    .map((el) => {
      const polygons = elementToPolygons(el);
      if (polygons.length === 0) return null;
      const tag = el.tags?.admin_level
        ? `taso ${el.tags.admin_level}`
        : el.tags?.place ?? el.type;
      return {
        id: el.id,
        label: `${el.tags?.name ?? name} (${tag}, ${el.type} ${el.id})`,
        polygons,
      };
    })
    .filter((c): c is AreaCandidate => c !== null);
}

/**
 * Hae kaupunginosan rajat kolmivaiheisesti:
 * 1) boundary=administrative, 2) place=suburb/neighbourhood/…, 3) node.
 */
export async function fetchAreaCandidates(
  name: string,
  onStage?: (stage: FetchStage) => void
): Promise<AreaFetchResult> {
  // Vaihe 1 — hallinnolliset rajat (sekä boundary=administrative että
  // type=boundary -relaatiot; suomalaiset kaupunginosat voivat olla
  // jälkimmäisiä).
  onStage?.("boundary");
  const boundary = await runQuery(`
[out:json];
(
  relation["name"="${name}"]["boundary"="administrative"];
  relation["name"="${name}"]["type"="boundary"]["admin_level"~"^(8|9|10|11)$"];
);
out geom;`);
  let candidates = toCandidates(name, boundary);
  if (candidates.length > 0) return { candidates, nodeOnly: false };

  // Vaihe 2 — place-tagatut relaatiot ja wayt.
  onStage?.("place");
  const place = await runQuery(`
[out:json];
(
  relation["name"="${name}"]["place"~"suburb|neighbourhood|quarter|village|hamlet"];
  way["name"="${name}"]["place"~"suburb|neighbourhood|quarter|village|hamlet"];
);
out geom;`);
  candidates = toCandidates(name, place);
  if (candidates.length > 0) return { candidates, nodeOnly: false };

  // Vaihe 3 — node (ei geometriaa).
  onStage?.("node");
  const node = await runQuery(`
[out:json];
(
  node["name"="${name}"]["place"~"suburb|neighbourhood|quarter|village|hamlet"];
);
out geom;`);
  return { candidates: [], nodeOnly: node.length > 0 };
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
