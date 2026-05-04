"use client";

import { useEffect, useState, useTransition } from "react";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { reorderSharedCitiesAction } from "@/lib/actions/cities";
import type { VisibleCity } from "@/lib/trip";

type Props = {
  cities: VisibleCity[];
  selectedCityId: string | null;
  onSelectCity: (id: string) => void;
  /** Si true, agrupa visualmente Antes / Viaje principal / Después.
   *  Si false, muestra solo el bloque shared (modo peek). */
  grouped?: boolean;
  /** Si true (solo seed), las shared se pueden drag-to-reorder dentro
   *  del bloque "Viaje principal". */
  reorderable?: boolean;
};

export function Timeline({
  cities,
  selectedCityId,
  onSelectCity,
  grouped,
  reorderable,
}: Props) {
  const buckets = bucketize(cities);

  if (cities.length === 0) {
    return (
      <p className="px-4 text-sm text-zinc-500">
        Todavía no hay ciudades en el itinerario.
      </p>
    );
  }

  if (!grouped) {
    return (
      <ChipsRow
        cities={buckets.shared}
        selectedCityId={selectedCityId}
        onSelectCity={onSelectCity}
      />
    );
  }

  return (
    <div className="space-y-3">
      {buckets.before.length > 0 && (
        <StaticSection
          label="Antes"
          cities={buckets.before}
          selectedCityId={selectedCityId}
          onSelectCity={onSelectCity}
        />
      )}

      {reorderable ? (
        <ReorderableSharedSection
          cities={buckets.shared}
          selectedCityId={selectedCityId}
          onSelectCity={onSelectCity}
        />
      ) : (
        <StaticSection
          label="Viaje principal"
          cities={buckets.shared}
          selectedCityId={selectedCityId}
          onSelectCity={onSelectCity}
        />
      )}

      {buckets.after.length > 0 && (
        <StaticSection
          label="Después"
          cities={buckets.after}
          selectedCityId={selectedCityId}
          onSelectCity={onSelectCity}
        />
      )}
    </div>
  );
}

function StaticSection({
  label,
  cities,
  selectedCityId,
  onSelectCity,
}: {
  label: string;
  cities: VisibleCity[];
  selectedCityId: string | null;
  onSelectCity: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <ChipsRow
        cities={cities}
        selectedCityId={selectedCityId}
        onSelectCity={onSelectCity}
      />
    </div>
  );
}

function ChipsRow({
  cities,
  selectedCityId,
  onSelectCity,
}: {
  cities: VisibleCity[];
  selectedCityId: string | null;
  onSelectCity: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 -mx-1 [scrollbar-width:thin]">
      {cities.map((c) => (
        <Chip
          key={c.id}
          city={c}
          isSelected={c.id === selectedCityId}
          onClick={() => onSelectCity(c.id)}
        />
      ))}
    </div>
  );
}

// =====================================================================
//  Reorderable shared section (solo seed)
// =====================================================================

function ReorderableSharedSection({
  cities,
  selectedCityId,
  onSelectCity,
}: {
  cities: VisibleCity[];
  selectedCityId: string | null;
  onSelectCity: (id: string) => void;
}) {
  // Local order para drag optimista. Sincronizamos cuando llegan props
  // nuevas (ej: revalidatePath después de un mutación distinta).
  const [items, setItems] = useState(cities);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(cities);
  }, [cities]);

  function handleDragEnd() {
    const newOrder = items.map((c) => c.id);
    const prevOrder = cities.map((c) => c.id);
    if (newOrder.every((id, i) => id === prevOrder[i])) return; // sin cambios

    startTransition(async () => {
      const result = await reorderSharedCitiesAction({
        orderedCityIds: newOrder,
      });
      if (!result.ok) {
        setError(result.error);
        setItems(cities); // rollback al snapshot del server
        setTimeout(() => setError(null), 3000);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between px-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Viaje principal
        </p>
        {pending ? (
          <span className="text-[10px] text-zinc-400">guardando…</span>
        ) : error ? (
          <span className="text-[10px] text-red-600">{error}</span>
        ) : (
          <span className="text-[10px] text-zinc-400">arrastrá para reordenar</span>
        )}
      </div>
      <Reorder.Group
        axis="x"
        values={items}
        onReorder={setItems}
        className="flex gap-2 overflow-x-auto px-4 pb-1 -mx-1 [scrollbar-width:thin]"
      >
        {items.map((c) => (
          <Reorder.Item
            key={c.id}
            value={c}
            onDragEnd={handleDragEnd}
            // El gesto de drag necesita prevenir scroll horizontal del contenedor.
            // touchAction:none evita que el browser cancele el gesto.
            style={{ touchAction: "none" }}
            className="shrink-0"
            whileDrag={{ scale: 1.05, zIndex: 10 }}
          >
            <Chip
              city={c}
              isSelected={c.id === selectedCityId}
              onClick={() => onSelectCity(c.id)}
              draggable
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

// =====================================================================
//  Chip
// =====================================================================

function Chip({
  city,
  isSelected,
  onClick,
  draggable,
}: {
  city: VisibleCity;
  isSelected: boolean;
  onClick: () => void;
  draggable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5",
        isSelected
          ? "bg-zinc-900 text-white border-zinc-900"
          : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400",
        city.visibility === "group" && !isSelected && "border-dashed",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      {draggable && (
        <GripVertical className="h-3.5 w-3.5 opacity-50" aria-hidden />
      )}
      {city.countryCode && (
        <span className="text-base leading-none" aria-hidden>
          {flagEmoji(city.countryCode)}
        </span>
      )}
      <span className="truncate max-w-[180px]">{city.name}</span>
    </button>
  );
}

function bucketize(cities: VisibleCity[]) {
  const sortedShared = cities
    .filter((c) => c.visibility === "shared")
    .sort((a, b) => a.order - b.order);
  if (sortedShared.length === 0) {
    return { before: [], shared: [], after: cities };
  }
  const minShared = sortedShared[0].order;
  const maxShared = sortedShared[sortedShared.length - 1].order;
  const before = cities
    .filter((c) => c.visibility === "group" && c.order < minShared)
    .sort((a, b) => a.order - b.order);
  const after = cities
    .filter((c) => c.visibility === "group" && c.order > maxShared)
    .sort((a, b) => a.order - b.order);
  return { before, shared: sortedShared, after };
}

function flagEmoji(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  if (cc.length !== 2) return "";
  const A = 0x41;
  const REGIONAL_INDICATOR = 0x1f1e6;
  return String.fromCodePoint(
    REGIONAL_INDICATOR + (cc.charCodeAt(0) - A),
    REGIONAL_INDICATOR + (cc.charCodeAt(1) - A)
  );
}
