"use client";

import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";

type Props = {
  onBack: () => void;
  title: React.ReactNode;
  /** Pequeñas etiquetas/badges al lado del título (p.ej. "archivada"). */
  meta?: React.ReactNode;
  /** Acciones a la derecha (menú, etc.). */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Header único para vistas de detalle dentro del bottom sheet.
 *
 * Es `sticky top-0` con fondo blanco — el contenido scrollea debajo y
 * el back + título se mantienen visibles. El `-mx-4 px-4` permite que
 * cubra todo el ancho del sheet aunque viva dentro de un wrapper con
 * padding horizontal.
 */
export function DetailHeader({ onBack, title, meta, actions, className }: Props) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-4 flex items-start gap-3 bg-white px-4 pt-1 pb-3",
        className,
      )}
    >
      <BackButton onClick={onBack} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[22px] leading-tight font-medium text-[var(--ink)] tracking-[-0.01em]">
          {title}
        </h2>
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
