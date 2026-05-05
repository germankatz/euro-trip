"use client";

import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Trigger único para menús de acciones — 3 puntos verticales,
 * hairline circular, mismo tamaño que el BackButton para que el header
 * quede simétrico (back izq · kebab der).
 */
export const KebabButton = forwardRef<HTMLButtonElement, Props>(function KebabButton(
  { className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Más acciones"
      {...props}
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--hairline)] bg-white text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30 data-[popup-open]:bg-[var(--surface-soft)]",
        className,
      )}
    >
      <MoreVertical className="h-4 w-4" strokeWidth={2.25} />
    </button>
  );
});
