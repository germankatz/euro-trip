"use client";

import { ChevronRight } from "lucide-react";
import type { VisibleCity, VisibleAccommodation } from "@/lib/trip";
import { countryName, flagEmoji } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";

type Props = {
  cities: VisibleCity[];
  accommodations?: VisibleAccommodation[];
  onSelectCity: (id: string) => void;
  intro?: React.ReactNode;
};

function formatDate(date: Date): string {
  const dayOfWeek = date.toLocaleDateString("es-AR", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("es-AR", { month: "long" });
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${day} de ${month}`;
}

function getCityDateRange(
  cityId: string,
  accommodations: VisibleAccommodation[],
): string | null {
  const active = accommodations.filter(
    (a) => a.cityId === cityId && !a.archivedAt,
  );
  if (active.length === 0) return null;

  const start = new Date(
    Math.min(...active.map((a) => new Date(a.startDate).getTime())),
  );
  const end = new Date(
    Math.max(...active.map((a) => new Date(a.endDate).getTime())),
  );

  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Home: lista vertical plana de ciudades (sin agrupar por país).
 * Cada fila: bandera + nombre + país (subtítulo) + chevron.
 */
export function CitiesList({ cities, accommodations = [], onSelectCity, intro }: Props) {
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
            <CityRow
              city={city}
              dateRange={getCityDateRange(city.id, accommodations)}
              onClick={() => onSelectCity(city.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CityRow({
  city,
  dateRange,
  onClick,
}: {
  city: VisibleCity;
  dateRange: string | null;
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
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[16px] font-semibold text-[var(--ink)]">
            {city.name}
          </span>
          {city.countryCode && (
            <span className="shrink-0 text-[12px] text-[var(--muted-foreground)]">
              {countryName(city.countryCode)}
            </span>
          )}
          {city.visibility === "group" && (
            <Badge
              variant="outline"
              className="shrink-0 border-[var(--hairline)] text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] px-1.5 py-0"
            >
              privada
            </Badge>
          )}
        </div>
        {dateRange && (
          <div className="truncate text-[12px] text-[var(--muted-foreground)] mt-0.5">
            {dateRange}
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
