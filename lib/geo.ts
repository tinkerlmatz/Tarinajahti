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
