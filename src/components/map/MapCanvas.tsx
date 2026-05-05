"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { MapPin, MapPinOff } from "lucide-react";
import type {
  VisibleAccommodation,
  VisibleActivity,
  VisibleCity,
} from "@/lib/trip";
import type { SheetState } from "@/components/sheet/BottomSheet";

type Props = {
  cities: VisibleCity[];
  activities: VisibleActivity[];
  accommodations: VisibleAccommodation[];
  selectedCityId: string | null;
  selectedActivityId: string | null;
  selectedAccommodationId: string | null;
  onSelectCity: (id: string) => void;
  onSelectActivity: (id: string, cityId: string) => void;
  onSelectAccommodation: (id: string, cityId: string) => void;
  /** Click en el lienzo (no sobre un marker). Se usa para "salir" de un detalle. */
  onMapBackground?: () => void;
  sheetState: SheetState;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const ROUTE_SOURCE_ID = "trip-route";
const ROUTE_LAYER_ID = "trip-route-line";

// Estos deben coincidir con BottomSheet.tsx (peek fijo, half/full fracción).
const SHEET_PEEK_PX = 130;
const SHEET_HALF_FRAC = 0.5;
const SHEET_FULL_FRAC = 0.95;

// Desktop: el sheet vive en md:left-4 md:w-[420px] (BottomSheet.tsx). El área
// visible "limpia" del mapa es lo que queda a la derecha, así que usamos
// padding.left para que mapbox centre el target en esa zona en lugar de bajo
// el panel.
const DESKTOP_BREAKPOINT_PX = 768; // tailwind md
const DESKTOP_SHEET_LEFT_OFFSET_PX = 16; // md:left-4
const DESKTOP_SHEET_WIDTH_PX = 420; // md:w-[420px]
const DESKTOP_SHEET_GAP_PX = 16; // respiro entre panel y centro

function paddingForSheet(state: SheetState): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof window === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
  if (isDesktop) {
    // En desktop el sheet es un panel lateral fijo: no varía con el state.
    const left =
      DESKTOP_SHEET_LEFT_OFFSET_PX +
      DESKTOP_SHEET_WIDTH_PX +
      DESKTOP_SHEET_GAP_PX;
    return { top: 0, right: 0, bottom: 0, left };
  }
  const vh = window.innerHeight;
  let bottom = 0;
  switch (state) {
    case "peek":
      bottom = SHEET_PEEK_PX;
      break;
    case "half":
      bottom = vh * SHEET_HALF_FRAC;
      break;
    case "full":
      // Mapa casi totalmente cubierto: padding equivalente al sheet abierto,
      // acotado para que mapbox no descarte el flyTo.
      bottom = Math.min(vh * SHEET_FULL_FRAC, vh - 80);
      break;
  }
  return { top: 0, right: 0, bottom, left: 0 };
}

export function MapCanvas({
  cities,
  activities,
  accommodations,
  selectedCityId,
  selectedActivityId,
  selectedAccommodationId,
  onSelectCity,
  onSelectActivity,
  onSelectAccommodation,
  onMapBackground,
  sheetState,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const cityMarkersRef = useRef<Map<string, MapboxMarker>>(new Map());
  const activityMarkersRef = useRef<Map<string, MapboxMarker>>(new Map());
  const accommodationMarkersRef = useRef<Map<string, MapboxMarker>>(new Map());
  const [showActivities, setShowActivities] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  // Mantener el callback en un ref para no resuscribir el listener de mapbox
  // en cada render (init effect corre una sola vez).
  const onMapBackgroundRef = useRef(onMapBackground);
  useEffect(() => {
    onMapBackgroundRef.current = onMapBackground;
  }, [onMapBackground]);

  // Activities geo-localizadas de la city seleccionada (lat/lng se resuelven
  // server-side y se persisten — acá ya vienen listos).
  const activitiesWithCoords = useMemo(() => {
    if (!selectedCityId) return [];
    return activities
      .filter(
        (a) =>
          a.cityId === selectedCityId &&
          !a.archivedAt &&
          a.lat != null &&
          a.lng != null,
      )
      .map((a) => ({
        activity: a,
        coords: { lat: a.lat as number, lng: a.lng as number },
      }));
  }, [activities, selectedCityId]);

  const accommodationsWithCoords = useMemo(() => {
    if (!selectedCityId) return [];
    return accommodations
      .filter(
        (a) =>
          a.cityId === selectedCityId &&
          !a.archivedAt &&
          a.lat != null &&
          a.lng != null,
      )
      .map((a) => ({
        accommodation: a,
        coords: { lat: a.lat as number, lng: a.lng as number },
      }));
  }, [accommodations, selectedCityId]);

  // Init map una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter: [number, number] =
      cities[0] ? [cities[0].lng, cities[0].lat] : [10, 45];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: cities.length > 0 ? 4 : 2,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("error", (e) => {
      console.error("[MapCanvas] mapbox error:", e.error?.message ?? e);
    });
    // Click en el lienzo (no en markers — esos son HTML aparte y stop-propagan
    // sus propios clicks, así que mapbox no los recibe acá).
    map.on("click", () => {
      onMapBackgroundRef.current?.();
    });
    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 3,
          "line-opacity": 0.85,
          "line-dasharray": [0.4, 1.6],
        },
      });

      renderCityMarkersAndRoute(map, cities, cityMarkersRef.current, onSelectCity);
      fitBoundsToCities(map, cities, paddingForSheet(sheetState));
      setMapReady(true);
    });

    return () => {
      cityMarkersRef.current.forEach((m) => m.remove());
      cityMarkersRef.current.clear();
      activityMarkersRef.current.forEach((m) => m.remove());
      activityMarkersRef.current.clear();
      accommodationMarkersRef.current.forEach((m) => m.remove());
      accommodationMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambios en cities → re-render markers + polyline + ajustar viewport.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    renderCityMarkersAndRoute(map, cities, cityMarkersRef.current, onSelectCity);
  }, [cities, onSelectCity, mapReady]);

  // Activity markers: solo cuando hay city seleccionada y el toggle está on.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visible = showActivities ? activitiesWithCoords : [];
    renderActivityMarkers(
      map,
      visible,
      activityMarkersRef.current,
      onSelectActivity,
      selectedActivityId,
    );
  }, [
    activitiesWithCoords,
    showActivities,
    onSelectActivity,
    selectedActivityId,
    mapReady,
  ]);

  // Accommodation markers: igual que activities, dependen de la city seleccionada.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    renderAccommodationMarkers(
      map,
      accommodationsWithCoords,
      accommodationMarkersRef.current,
      onSelectAccommodation,
      selectedAccommodationId,
    );
  }, [
    accommodationsWithCoords,
    onSelectAccommodation,
    selectedAccommodationId,
    mapReady,
  ]);

  // Selected city/activity o sheetState change → recentrar respetando el área
  // visible del mapa (la parte que no tapa el sheet) usando padding.bottom.
  // Si hay activity seleccionada con coords, priorizamos esa con más zoom.
  // Si no hay city seleccionada (estamos en el listado) mantenemos la vista
  // inicial: ningún re-fit cuando el usuario arrastra el sheet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const padding = paddingForSheet(sheetState);

    if (selectedActivityId) {
      const a = activities.find((x) => x.id === selectedActivityId);
      if (a && a.lat != null && a.lng != null) {
        map.flyTo({
          center: [a.lng as number, a.lat as number],
          zoom: 14,
          padding,
          essential: true,
          duration: 1000,
        });
        return;
      }
    }

    if (selectedAccommodationId) {
      const a = accommodations.find((x) => x.id === selectedAccommodationId);
      if (a && a.lat != null && a.lng != null) {
        map.flyTo({
          center: [a.lng as number, a.lat as number],
          zoom: 14,
          padding,
          essential: true,
          duration: 1000,
        });
        return;
      }
    }

    if (!selectedCityId) return;
    const target = cities.find((c) => c.id === selectedCityId);
    if (!target) return;
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: 11,
      padding,
      essential: true,
      duration: 1200,
    });
  }, [
    selectedCityId,
    selectedActivityId,
    selectedAccommodationId,
    cities,
    activities,
    accommodations,
    sheetState,
  ]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-zinc-950 text-zinc-100 p-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-medium">Mapbox no configurado</p>
          <p className="text-sm text-zinc-400">
            Pegá tu token en{" "}
            <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> dentro de{" "}
            <code className="text-xs">.env</code> y reiniciá <code className="text-xs">npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  // Mostrar el toggle solo cuando hay activities con coords en la city
  // seleccionada (si no hay nada que togglear, no ensuciamos la UI).
  const showToggle = !!selectedCityId && activitiesWithCoords.length > 0;

  return (
    <div className="absolute inset-0 bg-zinc-200">
      <div ref={containerRef} className="h-full w-full" />
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowActivities((v) => !v)}
          aria-pressed={showActivities}
          title={showActivities ? "Ocultar actividades en el mapa" : "Mostrar actividades en el mapa"}
          className="absolute top-3 right-16 z-30 inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--ink)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-soft)]"
        >
          {showActivities ? (
            <MapPin className="h-3.5 w-3.5 text-amber-600" />
          ) : (
            <MapPinOff className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          )}
          {activitiesWithCoords.length}
        </button>
      )}
    </div>
  );
}

export default MapCanvas;

function renderCityMarkersAndRoute(
  map: MapboxMap,
  cities: VisibleCity[],
  markersMap: Map<string, MapboxMarker>,
  onSelectCity: (id: string) => void
) {
  // Markers: limpiar los que ya no están y agregar/actualizar el resto.
  const seen = new Set<string>();
  for (const city of cities) {
    seen.add(city.id);
    const existing = markersMap.get(city.id);
    if (existing) {
      existing.setLngLat([city.lng, city.lat]);
      continue;
    }

    // Sin hover:scale: el transform mueve el bbox fuera del cursor y entra en
    // loop hover/leave (flicker). Resaltamos via ring igual que activities.
    const el = document.createElement("button");
    el.type = "button";
    el.className =
      "h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow-md cursor-pointer ring-0 hover:ring-4 ring-sky-300/60 transition-[box-shadow,background-color]";
    el.title = city.name;
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("touchstart", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelectCity(city.id);
    });

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([city.lng, city.lat])
      .addTo(map);
    markersMap.set(city.id, marker);
  }
  for (const [id, marker] of markersMap) {
    if (!seen.has(id)) {
      marker.remove();
      markersMap.delete(id);
    }
  }

  // Polyline: una sola feature LineString uniendo las cities en orden.
  const source = map.getSource(ROUTE_SOURCE_ID);
  if (source && "setData" in source) {
    const coords = cities.map((c) => [c.lng, c.lat] as [number, number]);
    (source as mapboxgl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features:
        coords.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: coords },
              },
            ]
          : [],
    });
  }
}

function renderActivityMarkers(
  map: MapboxMap,
  visible: { activity: VisibleActivity; coords: { lat: number; lng: number } }[],
  markersMap: Map<string, MapboxMarker>,
  onSelectActivity: (id: string, cityId: string) => void,
  selectedActivityId: string | null,
) {
  const seen = new Set<string>();
  for (const { activity, coords } of visible) {
    seen.add(activity.id);
    const isSelected = activity.id === selectedActivityId;
    const existing = markersMap.get(activity.id);
    if (existing) {
      existing.setLngLat([coords.lng, coords.lat]);
      applyActivityMarkerState(existing.getElement() as HTMLElement, isSelected);
      continue;
    }

    // Sin transform en hover: hover:scale en un button con anchor en bbox
    // puede entrar en loop hover/leave (la escala mueve el bbox fuera del
    // cursor, hover off, vuelve, hover on → flicker) y mapbox interpreta el
    // mousedown→mouseup con drift como pan. Resaltamos via ring.
    // pointer-events:none en el SVG hijo para que el click siempre pegue en
    // el button. mousedown stopPropagation para que mapbox no inicie pan.
    const el = document.createElement("button");
    el.type = "button";
    el.title = activity.title;
    el.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("touchstart", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelectActivity(activity.id, activity.cityId);
    });
    applyActivityMarkerState(el, isSelected);

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
    markersMap.set(activity.id, marker);
  }
  for (const [id, marker] of markersMap) {
    if (!seen.has(id)) {
      marker.remove();
      markersMap.delete(id);
    }
  }
}

function renderAccommodationMarkers(
  map: MapboxMap,
  visible: { accommodation: VisibleAccommodation; coords: { lat: number; lng: number } }[],
  markersMap: Map<string, MapboxMarker>,
  onSelectAccommodation: (id: string, cityId: string) => void,
  selectedAccommodationId: string | null,
) {
  const seen = new Set<string>();
  for (const { accommodation, coords } of visible) {
    seen.add(accommodation.id);
    const isSelected = accommodation.id === selectedAccommodationId;
    const existing = markersMap.get(accommodation.id);
    if (existing) {
      existing.setLngLat([coords.lng, coords.lat]);
      applyAccommodationMarkerState(existing.getElement() as HTMLElement, isSelected);
      continue;
    }

    // Icono "bed" de lucide. Mismas precauciones que activity markers:
    // pointer-events:none en el SVG, stopPropagation de mousedown/touchstart
    // para que mapbox no inicie pan al clickear el marker.
    const el = document.createElement("button");
    el.type = "button";
    el.title = accommodation.title;
    el.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>';
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("touchstart", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelectAccommodation(accommodation.id, accommodation.cityId);
    });
    applyAccommodationMarkerState(el, isSelected);

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
    markersMap.set(accommodation.id, marker);
  }
  for (const [id, marker] of markersMap) {
    if (!seen.has(id)) {
      marker.remove();
      markersMap.delete(id);
    }
  }
}

function applyAccommodationMarkerState(el: HTMLElement, isSelected: boolean) {
  el.className = isSelected
    ? "grid place-items-center h-9 w-9 rounded-lg bg-violet-600 border-2 border-white shadow-lg cursor-pointer text-white ring-4 ring-violet-300/80 transition-[box-shadow,background-color]"
    : "grid place-items-center h-7 w-7 rounded-lg bg-violet-500 border-2 border-white shadow-md cursor-pointer text-white ring-0 hover:ring-4 ring-violet-300/60 transition-[box-shadow,background-color]";
  el.style.zIndex = isSelected ? "10" : "";
}

function applyActivityMarkerState(el: HTMLElement, isSelected: boolean) {
  // OJO: mapbox aplica `transform: translate3d(...)` directamente sobre este
  // elemento en cada frame del pan. No usar `transition-all` ni
  // `transition-transform` o los markers se animan mientras el usuario mueve
  // el mapa (lag perceptible). Solo transicionar shadow + color.
  el.className = isSelected
    ? "grid place-items-center h-9 w-9 rounded-full bg-amber-600 border-2 border-white shadow-lg cursor-pointer text-white ring-4 ring-amber-300/80 transition-[box-shadow,background-color]"
    : "grid place-items-center h-7 w-7 rounded-full bg-amber-500 border-2 border-white shadow-md cursor-pointer text-white ring-0 hover:ring-4 ring-amber-300/60 transition-[box-shadow,background-color]";
  // El seleccionado se monta encima de los demás markers.
  el.style.zIndex = isSelected ? "10" : "";
}

function fitBoundsToCities(
  map: MapboxMap,
  cities: VisibleCity[],
  basePadding: { top: number; right: number; bottom: number; left: number },
) {
  if (cities.length === 0) return;
  if (cities.length === 1) {
    map.flyTo({
      center: [cities[0].lng, cities[0].lat],
      zoom: 8,
      padding: basePadding,
    });
    return;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const c of cities) bounds.extend([c.lng, c.lat]);
  map.fitBounds(bounds, {
    padding: {
      top: 80 + basePadding.top,
      right: 80 + basePadding.right,
      bottom: 80 + basePadding.bottom,
      left: 80 + basePadding.left,
    },
    maxZoom: 9,
    duration: 0,
  });
}
