// Extrae coordenadas de URLs de Google Maps. Las URLs cortas
// (`maps.app.goo.gl/...`) son redirects: se resuelven server-side leyendo el
// Location del 302 y luego parseando la URL canónica.

export type LatLng = { lat: number; lng: number };

// Orden importa: en place URLs de Google ("/place/X/@cam_lat,cam_lng,zoom/data=...!3d<lat>!4d<lng>...")
// el `@` es la cámara (a veces el centro del mundo) y `!3d!4d` es el pin
// real. Probamos `!3d!4d` primero.
const PATTERNS: RegExp[] = [
  // !3d40.7589!4d-73.9851  ← coords reales del marker en place URLs
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  // ?q=40.7589,-73.9851 / &q=loc:40.7589,-73.9851
  /[?&]q=(?:loc:)?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // ?ll=40.7589,-73.9851
  /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // ?destination=40.7589,-73.9851
  /[?&]destination=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // /maps/search/48.758945,+2.372597 (redirect target de short URLs cuando
  // Google no tiene un place id — el `+` viene del encoding del espacio)
  /\/maps\/(?:search|dir|place)\/(-?\d+(?:\.\d+)?),[\s+]*(-?\d+(?:\.\d+)?)/,
  // .../@40.7589,-73.9851,15z  ← fallback: cámara
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
];

/** Extrae coords de un URL "largo" — sin red. */
export function extractCoordsFromMapsUrl(url: string | null | undefined): LatLng | null {
  if (!url) return null;
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    // dejar tal cual
  }
  for (const re of PATTERNS) {
    const m = decoded.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    return { lat, lng };
  }
  return null;
}

const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "maps.goo.gl"]);

function isShortMapsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return SHORT_HOSTS.has(u.host);
  } catch {
    return false;
  }
}

/**
 * Resuelve coords desde un URL de Google Maps. Si es short URL, sigue el
 * redirect manualmente (sin User-Agent de browser: con UA real Google
 * sirve una landing JS sin Location header). Devuelve null si no se puede
 * parsear o falla la red.
 *
 * NOTA: solo llamar desde server (en client lo bloquea CORS).
 */
export async function resolveCoordsFromMapsUrl(
  url: string | null | undefined,
  opts: { timeoutMs?: number; maxHops?: number } = {}
): Promise<LatLng | null> {
  if (!url) return null;

  // 1) Intento directo con la URL tal como viene.
  const direct = extractCoordsFromMapsUrl(url);
  if (direct) return direct;

  // 2) Si es short URL, seguir redirect manualmente.
  if (!isShortMapsUrl(url)) return null;

  const timeoutMs = opts.timeoutMs ?? 4000;
  const maxHops = opts.maxHops ?? 3;
  let current = url;

  for (let hop = 0; hop < maxHops; hop++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        // Sin User-Agent "real": Google devuelve el 302 limpio cuando no
        // identifica un browser.
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return null;
        const coords = extractCoordsFromMapsUrl(loc);
        if (coords) return coords;
        current = new URL(loc, current).toString();
        continue;
      }
      // No redirect: intentar parsear la URL final por si tiene coords.
      return extractCoordsFromMapsUrl(res.url);
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}
