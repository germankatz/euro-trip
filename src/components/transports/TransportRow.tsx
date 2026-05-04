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
        "flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-zinc-400 hover:bg-zinc-50",
        archived && "opacity-60"
      )}
    >
      <span aria-hidden className="text-lg leading-none">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {transport.fromName} → {transport.toName}
        </div>
        <div className="truncate text-xs text-zinc-500">
          {formatTransportRange(transport.departureAt, transport.arrivalAt)}
        </div>
      </div>
      {transport.company && (
        <span className="shrink-0 text-xs text-zinc-500">{transport.company}</span>
      )}
    </button>
  );
}
