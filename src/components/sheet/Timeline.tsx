"use client";

import { cn } from "@/lib/utils";
import type { VisibleCity } from "@/lib/trip";

type Props = {
  cities: VisibleCity[];
  selectedCityId: string | null;
  onSelectCity: (id: string) => void;
  /** Si true, agrupa visualmente Antes / Viaje principal / Después.
   *  Si false, muestra solo el bloque shared (modo peek). */
  grouped?: boolean;
};

export function Timeline({ cities, selectedCityId, onSelectCity, grouped }: Props) {
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
        <Section label="Antes" cities={buckets.before} selectedCityId={selectedCityId} onSelectCity={onSelectCity} />
      )}
      <Section label="Viaje principal" cities={buckets.shared} selectedCityId={selectedCityId} onSelectCity={onSelectCity} />
      {buckets.after.length > 0 && (
        <Section label="Después" cities={buckets.after} selectedCityId={selectedCityId} onSelectCity={onSelectCity} />
      )}
    </div>
  );
}

function Section({
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
      <ChipsRow cities={cities} selectedCityId={selectedCityId} onSelectCity={onSelectCity} />
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
      {cities.map((c) => {
        const isSelected = c.id === selectedCityId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectCity(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5",
              isSelected
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400",
              c.visibility === "group" && !isSelected && "border-dashed",
            )}
          >
            {c.countryCode && (
              <span className="text-base leading-none" aria-hidden>
                {flagEmoji(c.countryCode)}
              </span>
            )}
            <span className="truncate max-w-[180px]">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function bucketize(cities: VisibleCity[]) {
  // El campo `order` es global pero las shared forman un bloque contiguo.
  // Encontramos sus extremos y bucketizamos lo que está fuera.
  const sortedShared = cities
    .filter((c) => c.visibility === "shared")
    .sort((a, b) => a.order - b.order);
  if (sortedShared.length === 0) {
    return { before: [], shared: [], after: cities };
  }
  const minShared = sortedShared[0].order;
  const maxShared = sortedShared[sortedShared.length - 1].order;
  const before = cities.filter((c) => c.visibility === "group" && c.order < minShared).sort((a, b) => a.order - b.order);
  const after = cities.filter((c) => c.visibility === "group" && c.order > maxShared).sort((a, b) => a.order - b.order);
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
