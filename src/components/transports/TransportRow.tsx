"use client";

import { cn } from "@/lib/utils";
import type { VisibleTransport } from "@/lib/trip";
import { modeMeta, formatTransportRange, type TransportMode } from "./transport-shared";

type Props = {
  transport: VisibleTransport;
  archived?: boolean;
  onClick: () => void;
};

export function TransportRow({ transport, archived, onClick }: Props) {
  const meta = modeMeta(transport.mode as TransportMode);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-white px-3.5 py-3 text-left transition-shadow hover:shadow-[var(--shadow-card)]",
        archived && "opacity-60"
      )}
    >
      <span aria-hidden className="text-lg leading-none">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-[var(--ink)]">
          {transport.fromName} → {transport.toName}
        </div>
        <div className="truncate text-[13px] text-[var(--muted-foreground)]">
          {formatTransportRange(transport.departureAt, transport.arrivalAt)}
        </div>
      </div>
      {transport.company && (
        <span className="shrink-0 text-[12px] text-[var(--muted-foreground)]">
          {transport.company}
        </span>
      )}
    </button>
  );
}
