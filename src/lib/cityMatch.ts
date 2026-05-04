// Match transport endpoints (lat/lng) a Cities del trip por proximidad.
// Decisión: la más cercana dentro del threshold gana. Sin desempate especial.

const EARTH_RADIUS_KM = 6371;
const DEFAULT_THRESHOLD_KM = 50;

export type CityCandidate = { id: string; lat: number; lng: number };

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Busca la city más cercana al punto dado dentro del threshold.
 * Devuelve `null` si ninguna está dentro de rango.
 */
export function findClosestCity(
  point: { lat: number; lng: number },
  cities: CityCandidate[],
  thresholdKm = DEFAULT_THRESHOLD_KM
): CityCandidate | null {
  let best: CityCandidate | null = null;
  let bestDist = Infinity;
  for (const c of cities) {
    const d = distanceKm(point, c);
    if (d <= thresholdKm && d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
