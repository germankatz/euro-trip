"use client";

import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageGallery } from "@/components/forms/ImageGallery";
import type { Actor } from "@/lib/permissions";
import type { VisibleCity, VisibleTransport } from "@/lib/trip";
import { TransportActions } from "./TransportActions";
import { modeMeta, type TransportMode } from "./transport-shared";

type Props = {
  transport: VisibleTransport;
  fromCity: VisibleCity | null;
  toCity: VisibleCity | null;
  actor: Actor;
  onBack: () => void;
  onAfterMutation?: () => void;
};

const fullDateFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const createdFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDuration(dep: Date, arr: Date): string {
  const ms = arr.getTime() - dep.getTime();
  if (ms < 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function TransportDetail({
  transport,
  fromCity,
  toCity,
  actor,
  onBack,
  onAfterMutation,
}: Props) {
  const meta = modeMeta(transport.mode as TransportMode);
  const archived = transport.archivedAt !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        {archived && (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            archivada
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <span aria-hidden>{meta.icon}</span>
          <span>
            {transport.fromName} → {transport.toName}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {fromCity && <CityChip label="origen" city={fromCity} />}
          {toCity && <CityChip label="destino" city={toCity} />}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Modo</dt>
        <dd>{meta.label}</dd>
        {transport.company && (
          <>
            <dt className="text-zinc-500">Compañía</dt>
            <dd>{transport.company}</dd>
          </>
        )}
        <dt className="text-zinc-500">Salida</dt>
        <dd>{fullDateFmt.format(transport.departureAt)}</dd>
        <dt className="text-zinc-500">Llegada</dt>
        <dd>{fullDateFmt.format(transport.arrivalAt)}</dd>
        <dt className="text-zinc-500">Duración</dt>
        <dd>{formatDuration(transport.departureAt, transport.arrivalAt)}</dd>
      </dl>

      {transport.imageUrls.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Imágenes</h3>
          <ImageGallery urls={transport.imageUrls} />
        </div>
      )}

      {transport.notesMd.trim() !== "" && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Notas</h3>
          <div className="prose prose-sm max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {transport.notesMd}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <TransportActions
        actor={actor}
        transport={transport}
        onAfterMutation={onAfterMutation}
      />

      <p className="border-t pt-3 text-xs text-zinc-500">
        Creado: {createdFmt.format(transport.createdAt)}
      </p>
    </div>
  );
}

function CityChip({ label, city }: { label: string; city: VisibleCity }) {
  return (
    <Badge variant="outline" className="text-xs">
      {label}: {city.name}
      {city.countryCode && (
        <span className="ml-1 text-zinc-500">({city.countryCode})</span>
      )}
    </Badge>
  );
}
