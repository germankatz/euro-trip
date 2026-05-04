"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CitySearchInput } from "@/components/forms/CitySearchInput";
import { updateTransportAction } from "@/lib/actions/transports";
import type { GeoResult } from "@/lib/geocode";
import type { VisibleTransport } from "@/lib/trip";
import { TRANSPORT_MODES, type TransportMode } from "./transport-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: VisibleTransport;
};

function toLocalInput(d: Date): string {
  // datetime-local espera "yyyy-MM-ddTHH:mm" en hora local del browser.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function buildGeo(name: string, lat: number, lng: number): GeoResult {
  return { name, displayName: name, lat, lng };
}

export function EditTransportDialog({ open, onOpenChange, transport }: Props) {
  const [from, setFrom] = useState<GeoResult | null>(
    buildGeo(transport.fromName, transport.fromLat, transport.fromLng)
  );
  const [to, setTo] = useState<GeoResult | null>(
    buildGeo(transport.toName, transport.toLat, transport.toLng)
  );
  const [mode, setMode] = useState<TransportMode>(
    transport.mode as TransportMode
  );
  const [company, setCompany] = useState(transport.company ?? "");
  const [departureAt, setDepartureAt] = useState(toLocalInput(transport.departureAt));
  const [arrivalAt, setArrivalAt] = useState(toLocalInput(transport.arrivalAt));
  const [notesMd, setNotesMd] = useState(transport.notesMd ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from || !to) {
      setError("Elegí origen y destino del autocomplete.");
      return;
    }
    const dep = new Date(departureAt);
    const arr = new Date(arrivalAt);
    if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
      setError("Fechas inválidas.");
      return;
    }
    if (arr < dep) {
      setError("La llegada no puede ser antes de la salida.");
      return;
    }
    startTransition(async () => {
      const result = await updateTransportAction({
        id: transport.id,
        fromName: from.name,
        fromLat: from.lat,
        fromLng: from.lng,
        fromCountryCode: from.countryCode,
        toName: to.name,
        toLat: to.lat,
        toLng: to.lng,
        toCountryCode: to.countryCode,
        mode,
        company: company.trim() || undefined,
        departureAt: dep.toISOString(),
        arrivalAt: arr.toISOString(),
        notesMd,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar transporte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Origen</Label>
            <CitySearchInput value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1.5">
            <Label>Destino</Label>
            <CitySearchInput value={to} onChange={setTo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-mode">Modo</Label>
              <select
                id="t-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as TransportMode)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-company">Compañía</Label>
              <Input
                id="t-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Opcional"
                maxLength={100}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-dep">Salida</Label>
              <Input
                id="t-dep"
                type="datetime-local"
                value={departureAt}
                onChange={(e) => setDepartureAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-arr">Llegada</Label>
              <Input
                id="t-arr"
                type="datetime-local"
                value={arrivalAt}
                onChange={(e) => setArrivalAt(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Notas</Label>
            <textarea
              id="t-notes"
              value={notesMd}
              onChange={(e) => setNotesMd(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs"
              placeholder="Markdown soportado"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
