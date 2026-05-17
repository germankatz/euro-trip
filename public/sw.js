// Service Worker — Euro Trip PWA
// Estrategia:
//   · _next/static/* → CacheFirst (assets hasheados, seguros)
//   · api.mapbox.com → CacheFirst con límite de entradas (tiles del mapa)
//   · navegación (/)  → NetworkFirst con fallback a caché
//   · /api/*          → siempre red (mutaciones, auth)

const STATIC_CACHE = "static-v1";
const PAGES_CACHE = "pages-v1";
const TILES_CACHE = "tiles-v1";
const MAX_TILES = 600;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  const keep = new Set([STATIC_CACHE, PAGES_CACHE, TILES_CACHE]);
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Saltar auth y mutaciones de API
  if (url.pathname.startsWith("/api/")) return;

  // Tiles de Mapbox — CacheFirst
  if (url.hostname === "api.mapbox.com") {
    e.respondWith(handleTile(request));
    return;
  }

  // Assets estáticos de Next.js — CacheFirst
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(handleStatic(request));
    return;
  }

  // Navegación — NetworkFirst con fallback
  if (request.mode === "navigate") {
    e.respondWith(handleNavigate(request));
    return;
  }

  // Otros assets del mismo origen (íconos, fonts locales, etc.) — StaleWhileRevalidate
  if (url.origin === self.location.origin) {
    e.respondWith(handleSameOriginAsset(request));
  }
});

// ─── handlers ────────────────────────────────────────────────────────────────

async function handleStatic(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function handleNavigate(req) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Fallback a la raíz en caso de rutas desconocidas offline
    const root = await cache.match("/");
    if (root) return root;
    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function handleTile(req) {
  const cache = await caches.open(TILES_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) {
      // Rotar entradas antiguas si llegamos al límite
      const keys = await cache.keys();
      if (keys.length >= MAX_TILES) {
        await cache.delete(keys[0]);
      }
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response("", { status: 408, statusText: "Offline" });
  }
}

async function handleSameOriginAsset(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  return hit || fetchPromise;
}
