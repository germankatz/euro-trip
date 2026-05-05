"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CitySearchInput } from "@/components/forms/CitySearchInput";
import { createCityAction } from "@/lib/actions/cities";
import type { GeoResult } from "@/lib/geocode";
import { cn } from "@/lib/utils";

export type TripMemberLite = {
  userId: string;
  name: string;
  email: string;
};

type Props = {
  members: TripMemberLite[];
  /** Callback opcional cuando se crea con éxito (para selectear la nueva city) */
  onCreated?: (id: string) => void;
};

export function CreateCityModal({ members, onCreated }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-40 grid h-12 w-12 place-items-center rounded-full bg-[var(--rausch)] text-white ring-1 ring-black/10 shadow-lg transition hover:bg-[var(--rausch-active)] active:scale-95"
        aria-label="Agregar ciudad"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar ciudad</DialogTitle>
          <DialogDescription>
            Buscá la ciudad y elegí si la ven todos o solo un subgrupo.
          </DialogDescription>
        </DialogHeader>
        <Form
          members={members}
          onSuccess={(id) => {
            setOpen(false);
            onCreated?.(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Form({
  members,
  onSuccess,
}: {
  members: TripMemberLite[];
  onSuccess: (id: string) => void;
}) {
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [visibility, setVisibility] = useState<"shared" | "group">("shared");
  const [position, setPosition] = useState<"before" | "after">("after");
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleInvited(id: string) {
    setInvitedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError("Elegí una ciudad del autocomplete.");
      return;
    }
    startTransition(async () => {
      const result = await createCityAction({
        name: selected.name,
        lat: selected.lat,
        lng: selected.lng,
        countryCode: selected.countryCode,
        visibility,
        position: visibility === "group" ? position : undefined,
        inviteUserIds: visibility === "group" ? invitedIds : [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.data.id);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Ciudad</Label>
        <CitySearchInput value={selected} onChange={setSelected} autoFocus />
      </div>

      <div className="space-y-2">
        <Label>Visibilidad</Label>
        <div className="grid grid-cols-2 gap-2">
          <RadioCard
            checked={visibility === "shared"}
            onClick={() => setVisibility("shared")}
            title="Compartida"
            subtitle="La ven todos los miembros del trip."
          />
          <RadioCard
            checked={visibility === "group"}
            onClick={() => setVisibility("group")}
            title="Solo invitados"
            subtitle="La ven vos y los que invites."
          />
        </div>
      </div>

      {visibility === "group" && (
        <>
          <div className="space-y-2">
            <Label>Posición</Label>
            <div className="grid grid-cols-2 gap-2">
              <RadioCard
                checked={position === "before"}
                onClick={() => setPosition("before")}
                title="Antes del viaje"
                subtitle="Tramo previo."
              />
              <RadioCard
                checked={position === "after"}
                onClick={() => setPosition("after")}
                title="Después del viaje"
                subtitle="Tramo posterior."
              />
            </div>
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Invitar miembros del trip</Label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 divide-y">
                {members.map((m) => (
                  <label
                    key={m.userId}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={invitedIds.includes(m.userId)}
                      onChange={() => toggleInvited(m.userId)}
                      className="h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{m.name}</span>
                      <span className="text-xs text-zinc-500">{m.email}</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Vos quedás como miembro automáticamente.
              </p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RadioCard({
  checked,
  onClick,
  title,
  subtitle,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-left text-sm transition",
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 hover:border-zinc-400"
      )}
    >
      <div className="font-medium">{title}</div>
      <div
        className={cn(
          "mt-0.5 text-xs",
          checked ? "text-zinc-300" : "text-zinc-500"
        )}
      >
        {subtitle}
      </div>
    </button>
  );
}
