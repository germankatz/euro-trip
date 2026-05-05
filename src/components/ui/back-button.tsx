"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
};

/**
 * Botón circular único de "volver" — usado en todos los detalles
 * (ciudad, transporte, actividad, país). Ink + hairline, hover surface-soft.
 * Tamaño 32×32 (≈Airbnb icon-button-circle).
 */
export function BackButton({ onClick, ariaLabel = "Volver", className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--hairline)] bg-white text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
    </button>
  );
}
