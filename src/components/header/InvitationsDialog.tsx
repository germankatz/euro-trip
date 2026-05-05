"use client";

import { useState } from "react";
import { ChevronLeft, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareInner } from "@/components/cities/ShareCityButton";

type ShareableCity = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cities: ShareableCity[];
};

export function InvitationsDialog({ open, onOpenChange, cities }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? cities.find((c) => c.id === selectedId) ?? null
    : null;

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedId(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {selected ? (
          <>
            <DialogHeader>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mb-1 inline-flex items-center gap-1 self-start text-xs text-zinc-500 hover:text-[var(--ink)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Volver
              </button>
              <DialogTitle>Compartir {selected.name}</DialogTitle>
              <DialogDescription>
                Cualquiera con el link puede sumarse a esta ciudad.
              </DialogDescription>
            </DialogHeader>
            <ShareInner cityId={selected.id} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invitaciones</DialogTitle>
              <DialogDescription>
                Elegí una ciudad grupo para gestionar sus links.
              </DialogDescription>
            </DialogHeader>
            {cities.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Todavía no hay ciudades grupo donde puedas gestionar invitaciones.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-zinc-200">
                {cities.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Users className="h-4 w-4 text-zinc-500" />
                        {c.name}
                      </span>
                      <span className="text-xs text-zinc-400">Gestionar →</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
