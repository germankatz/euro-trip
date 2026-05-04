"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisibleActivity } from "@/lib/trip";

type Props = {
  activity: VisibleActivity;
  archived?: boolean;
  onClick: () => void;
};

export function ActivityRow({ activity, archived, onClick }: Props) {
  const preview = firstLine(activity.notesMd);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-zinc-400 hover:bg-zinc-50",
        archived && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{activity.title}</div>
        {preview && (
          <div className="truncate text-xs text-zinc-500">{preview}</div>
        )}
      </div>
      {activity.mapsUrl && (
        <MapPin
          aria-hidden
          className="h-4 w-4 shrink-0 text-zinc-500"
        />
      )}
    </button>
  );
}

function firstLine(md: string): string {
  if (!md) return "";
  const line = md.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  return line.trim();
}
