// Cliente para Nominatim (OpenStreetMap) usado por /api/geocode.
//
// Política de uso de Nominatim:
//   - User-Agent identificable
//   - Max 1 req/s
//   - Cachear resultados
//   - No bulk-fetching
// Más info: https://operations.osmfoundation.org/policies/nominatim/

export type GeoResult = {
  /** Nombre corto resuelto (ej: "Berlin, Germany") */
  name: string;
  /** Texto completo de Nominatim, opcional para UI */
  displayName: string;
  lat: number;
  lng: number;
  countryCode?: string;
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "travel-itinerary-app/0.1 (chuky.ger@gmail.com)";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const CACHE_MAX_ENTRIES = 500;

type CacheEntry = { ts: number; data: GeoResult[] };
const cache = new Map<string, CacheEntry>();

let lastCallAt = 0;
let inflight: Promise<unknown> = Promise.resolve();

async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  // Encadenar llamadas para garantizar serialización; entre cada par,
  // esperar al menos 1100ms desde la última request a Nominatim.
  const next = inflight.then(async () => {
    const elapsed = Date.now() - lastCallAt;
    const wait = Math.max(0, 1100 - elapsed);
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  inflight = next.catch(() => {}); // no romper la cadena por un error
  return next;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cacheGet(key: string): GeoResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Re-insert para LRU-ish: la última usada queda al final del Map.
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function cacheSet(key: string, data: GeoResult[]) {
  cache.set(key, { ts: Date.now(), data });
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

type NominatimRow = {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class?: string;
  address?: { country_code?: string };
  name?: string;
};

const ALLOWED_TYPES = new Set([
  "city",
  "town",
  "village",
  "administrative",
  "municipality",
]);

export async function geocode(query: string, limit = 8): Promise<GeoResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const key = `${q}::${limit}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));

  const rows = await rateLimited(async () => {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "es,en",
      },
      // No queremos el cache por defecto de Next aquí — manejamos cache propio.
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Nominatim ${res.status}`);
    }
    return (await res.json()) as NominatimRow[];
  });

  const filtered: GeoResult[] = rows
    .filter((r) => ALLOWED_TYPES.has(r.type))
    .map((r) => ({
      name: r.name ?? r.display_name.split(",")[0]?.trim() ?? r.display_name,
      displayName: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      countryCode: r.address?.country_code?.toUpperCase(),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));

  cacheSet(key, filtered);
  return filtered;
}
