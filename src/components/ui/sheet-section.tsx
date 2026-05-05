"use client";

import { cn } from "@/lib/utils";

/**
 * Primitivos de layout para el contenido del bottom sheet.
 * Los detalle-views (city, country, transport, activity) los reutilizan
 * para que toda la app tenga el mismo ritmo visual.
 */

export function SheetSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {title && (
        <h3 className="text-[15px] font-semibold text-[var(--ink)]">{title}</h3>
      )}
      {children}
    </section>
  );
}

export function SheetEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--surface-soft)]/60 px-3.5 py-4 text-sm text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}

export function SheetDivider() {
  return <div className="h-px bg-[var(--hairline-soft)]" />;
}
