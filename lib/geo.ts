const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine-etäisyys metreinä kahden lat/lng-pisteen välillä. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Suuntakulma (bearing) asteina pohjoisesta myötäpäivään, pisteestä 1 pisteeseen 2. */
export function bearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const DIRECTIONS_FI = [
  "pohjoiseen",
  "koilliseen",
  "itään",
  "kaakkoon",
  "etelään",
  "lounaaseen",
  "länteen",
  "luoteeseen",
];

/** Suuntakulma → suomenkielinen ilmansuunta (allatiivi). */
export function directionLabel(deg: number): string {
  return DIRECTIONS_FI[Math.round(deg / 45) % 8];
}

/** Onko piste renkaan (ring, [lng,lat][]) sisällä — ray casting. */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Onko piste GeoJSON MultiPolygonin (tai Polygonin) sisällä.
 * Boundary on muotoa { type, coordinates }. Koordinaatit [lng, lat].
 */
export function pointInBoundary(
  lat: number,
  lng: number,
  boundary: unknown
): boolean {
  const geo = boundary as { type?: string; coordinates?: unknown } | null;
  if (!geo || !geo.coordinates) return false;

  const polygons =
    geo.type === "MultiPolygon"
      ? (geo.coordinates as number[][][][])
      : geo.type === "Polygon"
      ? [geo.coordinates as number[][][]]
      : [];

  for (const polygon of polygons) {
    const [outer, ...holes] = polygon;
    if (!outer) continue;
    if (pointInRing(lng, lat, outer)) {
      const inHole = holes.some((h) => pointInRing(lng, lat, h));
      if (!inHole) return true;
    }
  }
  return false;
}

/** Muotoile etäisyys luettavaksi: "340 m" / "1,2 km". */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
  }
  if (meters >= 100) {
    return `${Math.round(meters / 10) * 10} m`;
  }
  return `${Math.round(meters)} m`;
}
