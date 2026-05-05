"use client";

import { BedDouble, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisibleAccommodation } from "@/lib/trip";
import { formatStayRange } from "./accommodation-shared";

type Props = {
  accommodation: VisibleAccommodation;
  archived?: boolean;
  onClick: () => void;
};

export function AccommodationRow({ accommodation, archived, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-white px-3.5 py-3 text-left transition-shadow hover:shadow-[var(--shadow-card)]",
        archived && "opacity-60"
      )}
    >
      <BedDouble
        aria-hidden
        className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-[var(--ink)]">
          {accommodation.title}
        </div>
        <div className="truncate text-[13px] text-[var(--muted-foreground)]">
          {formatStayRange(
            new Date(accommodation.startDate),
            new Date(accommodation.endDate)
          )}
        </div>
      </div>
      {accommodation.mapsUrl && (
        <MapPin
          aria-hidden
          className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]"
        />
      )}
    </button>
  );
}
