"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { VisibleCity } from "@/lib/trip";

type Props = {
  cities: VisibleCity[];
  selectedCityId: string | null;
  onSelectCity: (id: string) => void;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const ROUTE_SOURCE_ID = "trip-route";
const ROUTE_LAYER_ID = "trip-route-line";

export function MapCanvas({ cities, selectedCityId, onSelectCity }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, MapboxMarker>>(new Map());

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

    map.on("load", () => {
      // Fuente + layer para la polyline. La data se actualiza en otro effect
      // cuando cambian las cities.
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

      // Disparar el primer render de markers/route. (El effect siguiente
      // depende de mapLoaded → usamos un trigger via dummy state; aquí
      // forzamos con renderMarkersAndRoute imperativo.)
      renderMarkersAndRoute(map, cities, markersRef.current, onSelectCity);
      fitBoundsToCities(map, cities);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambios en cities → re-render markers + polyline + ajustar viewport.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      // Si todavía no cargó el estilo, esperamos al evento load (el init
      // hizo el primer render). Para updates posteriores normalmente ya
      // está listo.
      const onLoad = () => {
        renderMarkersAndRoute(map, cities, markersRef.current, onSelectCity);
        fitBoundsToCities(map, cities);
      };
      map.once("load", onLoad);
      return () => {
        map.off("load", onLoad);
      };
    }
    renderMarkersAndRoute(map, cities, markersRef.current, onSelectCity);
  }, [cities, onSelectCity]);

  // Selected city change → flyTo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCityId) return;
    const target = cities.find((c) => c.id === selectedCityId);
    if (!target) return;
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: 11,
      essential: true,
      duration: 1200,
    });
  }, [selectedCityId, cities]);

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

  return <div ref={containerRef} className="absolute inset-0" />;
}

function renderMarkersAndRoute(
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

    const el = document.createElement("button");
    el.type = "button";
    el.className =
      "h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform";
    el.title = city.name;
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

function fitBoundsToCities(map: MapboxMap, cities: VisibleCity[]) {
  if (cities.length === 0) return;
  if (cities.length === 1) {
    map.flyTo({ center: [cities[0].lng, cities[0].lat], zoom: 8 });
    return;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const c of cities) bounds.extend([c.lng, c.lat]);
  map.fitBounds(bounds, { padding: 80, maxZoom: 9, duration: 0 });
}
