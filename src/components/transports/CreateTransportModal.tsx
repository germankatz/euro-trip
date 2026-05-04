"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CitySearchInput } from "@/components/forms/CitySearchInput";
import { MarkdownInput } from "@/components/forms/MarkdownInput";
import { ImageUploader } from "@/components/forms/ImageUploader";
import { createTransportAction } from "@/lib/actions/transports";
import { findClosestCity } from "@/lib/cityMatch";
import type { GeoResult } from "@/lib/geocode";
import type { VisibleCity } from "@/lib/trip";
import { cn } from "@/lib/utils";
import { TRANSPORT_MODES, type TransportMode } from "./transport-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledEndpoint: { side: "from" | "to"; city: VisibleCity };
  tripCities: VisibleCity[];
  onCreated?: (id: string) => void;
};

type QuickAddCfg = {
  enabled: boolean;
  visibility: "shared" | "group";
  position: "before" | "after";
};

const DEFAULT_QUICK_ADD: QuickAddCfg = {
  enabled: false,
  visibility: "shared",
  position: "after",
};

export function CreateTransportModal({
  open,
  onOpenChange,
  prefilledEndpoint,
  tripCities,
  onCreated,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar transporte</DialogTitle>
          <DialogDescription>
            Conectá tu ciudad con otra del itinerario o una nueva.
          </DialogDescription>
        </DialogHeader>
        <Form
          key={`${prefilledEndpoint.side}-${prefilledEndpoint.city.id}`}
          prefilledEndpoint={prefilledEndpoint}
          tripCities={tripCities}
          onSuccess={(id) => {
            onOpenChange(false);
            onCreated?.(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function geoFromCity(city: VisibleCity): GeoResult {
  return {
    name: city.name,
    displayName: city.name,
    lat: city.lat,
    lng: city.lng,
    countryCode: city.countryCode ?? undefined,
  };
}

function Form({
  prefilledEndpoint,
  tripCities,
  onSuccess,
}: {
  prefilledEndpoint: { side: "from" | "to"; city: VisibleCity };
  tripCities: VisibleCity[];
  onSuccess: (id: string) => void;
}) {
  const prefilledGeo = useMemo(
    () => geoFromCity(prefilledEndpoint.city),
    [prefilledEndpoint.city]
  );

  const [from, setFrom] = useState<GeoResult | null>(
    prefilledEndpoint.side === "from" ? prefilledGeo : null
  );
  const [to, setTo] = useState<GeoResult | null>(
    prefilledEndpoint.side === "to" ? prefilledGeo : null
  );
  const [mode, setMode] = useState<TransportMode>("plane");
  const [company, setCompany] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [arrivalAt, setArrivalAt] = useState("");
  const [notesMd, setNotesMd] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [fromQuickAdd, setFromQuickAdd] = useState<QuickAddCfg>(DEFAULT_QUICK_ADD);
  const [toQuickAdd, setToQuickAdd] = useState<QuickAddCfg>(DEFAULT_QUICK_ADD);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cityCandidates = useMemo(
    () => tripCities.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng })),
    [tripCities]
  );

  const fromMatches = useMemo(() => {
    if (!from) return null;
    if (prefilledEndpoint.side === "from") return prefilledEndpoint.city.id;
    return findClosestCity({ lat: from.lat, lng: from.lng }, cityCandidates)?.id ?? null;
  }, [from, cityCandidates, prefilledEndpoint]);

  const toMatches = useMemo(() => {
    if (!to) return null;
    if (prefilledEndpoint.side === "to") return prefilledEndpoint.city.id;
    return findClosestCity({ lat: to.lat, lng: to.lng }, cityCandidates)?.id ?? null;
  }, [to, cityCandidates, prefilledEndpoint]);

  const showFromQuickAdd =
    prefilledEndpoint.side !== "from" && from !== null && fromMatches === null;
  const showToQuickAdd =
    prefilledEndpoint.side !== "to" && to !== null && toMatches === null;

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

    const fromQA =
      showFromQuickAdd && fromQuickAdd.enabled
        ? {
            visibility: fromQuickAdd.visibility,
            position:
              fromQuickAdd.visibility === "group"
                ? fromQuickAdd.position
                : undefined,
          }
        : undefined;
    const toQA =
      showToQuickAdd && toQuickAdd.enabled
        ? {
            visibility: toQuickAdd.visibility,
            position:
              toQuickAdd.visibility === "group"
                ? toQuickAdd.position
                : undefined,
          }
        : undefined;

    startTransition(async () => {
      const result = await createTransportAction({
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
        imageUrls,
        fromQuickAdd: fromQA,
        toQuickAdd: toQA,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.data.id);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Origen</Label>
        {prefilledEndpoint.side === "from" ? (
          <FixedEndpoint city={prefilledEndpoint.city} />
        ) : (
          <>
            <CitySearchInput value={from} onChange={setFrom} />
            {showFromQuickAdd && (
              <QuickAddBlock
                cityName={from!.name}
                cfg={fromQuickAdd}
                onChange={setFromQuickAdd}
              />
            )}
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Destino</Label>
        {prefilledEndpoint.side === "to" ? (
          <FixedEndpoint city={prefilledEndpoint.city} />
        ) : (
          <>
            <CitySearchInput value={to} onChange={setTo} />
            {showToQuickAdd && (
              <QuickAddBlock
                cityName={to!.name}
                cfg={toQuickAdd}
                onChange={setToQuickAdd}
              />
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ct-mode">Modo</Label>
          <select
            id="ct-mode"
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
          <Label htmlFor="ct-company">Compañía</Label>
          <Input
            id="ct-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Opcional"
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ct-dep">Salida</Label>
          <Input
            id="ct-dep"
            type="datetime-local"
            value={departureAt}
            onChange={(e) => setDepartureAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-arr">Llegada</Label>
          <Input
            id="ct-arr"
            type="datetime-local"
            value={arrivalAt}
            onChange={(e) => setArrivalAt(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ct-notes">Notas</Label>
        <MarkdownInput
          value={notesMd}
          onChange={setNotesMd}
          placeholder="Markdown soportado"
          height={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Imágenes</Label>
        <ImageUploader value={imageUrls} onChange={setImageUrls} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FixedEndpoint({ city }: { city: VisibleCity }) {
  return (
    <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm">
      <span className="font-medium">{city.name}</span>
      {city.countryCode && (
        <span className="ml-1.5 text-xs text-zinc-500">({city.countryCode})</span>
      )}
    </div>
  );
}

function QuickAddBlock({
  cityName,
  cfg,
  onChange,
}: {
  cityName: string;
  cfg: QuickAddCfg;
  onChange: (next: QuickAddCfg) => void;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => onChange({ ...cfg, enabled: e.target.checked })}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-medium">{cityName}</span> no está en tu
          itinerario. ¿Agregarla?
        </span>
      </label>

      {cfg.enabled && (
        <div className="mt-3 space-y-3 pl-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Visibilidad</Label>
            <div className="grid grid-cols-2 gap-2">
              <RadioCard
                checked={cfg.visibility === "shared"}
                onClick={() => onChange({ ...cfg, visibility: "shared" })}
                title="Compartida"
                subtitle="La ven todos."
              />
              <RadioCard
                checked={cfg.visibility === "group"}
                onClick={() => onChange({ ...cfg, visibility: "group" })}
                title="Solo invitados"
                subtitle="La ven vos y los que invites."
              />
            </div>
          </div>

          {cfg.visibility === "group" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Posición</Label>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard
                  checked={cfg.position === "before"}
                  onClick={() => onChange({ ...cfg, position: "before" })}
                  title="Antes"
                  subtitle="Tramo previo."
                />
                <RadioCard
                  checked={cfg.position === "after"}
                  onClick={() => onChange({ ...cfg, position: "after" })}
                  title="Después"
                  subtitle="Tramo posterior."
                />
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Vos quedás como miembro automáticamente.
          </p>
        </div>
      )}
    </div>
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
        "rounded-lg border px-3 py-2 text-left text-sm transition",
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white hover:border-zinc-400"
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
