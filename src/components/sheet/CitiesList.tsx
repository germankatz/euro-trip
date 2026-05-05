"use client";

import { ChevronRight } from "lucide-react";
import type { VisibleCity } from "@/lib/trip";
import { countryName, flagEmoji } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";

type Props = {
  cities: VisibleCity[];
  onSelectCity: (id: string) => void;
  intro?: React.ReactNode;
};

/**
 * Home: lista vertical plana de ciudades (sin agrupar por país).
 * Cada fila: bandera + nombre + país (subtítulo) + chevron.
 */
export function CitiesList({ cities, onSelectCity, intro }: Props) {
  const sorted = [...cities]
    .filter((c) => !c.archivedAt)
    .sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <div className="px-4 pt-2">
        <p className="text-sm text-[var(--muted-foreground)]">
          Todavía no hay ciudades en el itinerario.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-1 space-y-3">
      {intro && (
        <p className="text-[13px] text-[var(--muted-foreground)]">{intro}</p>
      )}
      <ul className="divide-y divide-[var(--hairline-soft)]">
        {sorted.map((city) => (
          <li key={city.id}>
            <CityRow city={city} onClick={() => onSelectCity(city.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CityRow({
  city,
  onClick,
}: {
  city: VisibleCity;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--surface-soft)] -mx-4 px-4"
    >
      <span className="text-[26px] leading-none" aria-hidden>
        {flagEmoji(city.countryCode) || "🏳"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[16px] font-semibold text-[var(--ink)]">
            {city.name}
          </span>
          {city.visibility === "group" && (
            <Badge
              variant="outline"
              className="border-[var(--hairline)] text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] px-1.5 py-0"
            >
              privada
            </Badge>
          )}
        </div>
        {city.countryCode && (
          <div className="truncate text-[13px] text-[var(--muted-foreground)]">
            {countryName(city.countryCode)}
          </div>
        )}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]"
        aria-hidden
      />
    </button>
  );
}
