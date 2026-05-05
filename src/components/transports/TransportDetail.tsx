"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/ui/detail-header";
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
    <div className="space-y-5">
      <DetailHeader
        onBack={onBack}
        title={
          <span className="flex items-center gap-2">
            <span aria-hidden>{meta.icon}</span>
            <span className="truncate">
              {transport.fromName} → {transport.toName}
            </span>
          </span>
        }
        meta={
          <>
            {fromCity && <CityChip label="origen" city={fromCity} />}
            {toCity && <CityChip label="destino" city={toCity} />}
            {archived && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                archivada
              </Badge>
            )}
          </>
        }
        actions={
          <TransportActions
            actor={actor}
            transport={transport}
            onAfterMutation={onAfterMutation}
          />
        }
      />

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-[var(--muted-foreground)]">Modo</dt>
        <dd className="text-[var(--ink)]">{meta.label}</dd>
        {transport.company && (
          <>
            <dt className="text-[var(--muted-foreground)]">Compañía</dt>
            <dd className="text-[var(--ink)]">{transport.company}</dd>
          </>
        )}
        <dt className="text-[var(--muted-foreground)]">Salida</dt>
        <dd className="text-[var(--ink)]">{fullDateFmt.format(transport.departureAt)}</dd>
        <dt className="text-[var(--muted-foreground)]">Llegada</dt>
        <dd className="text-[var(--ink)]">{fullDateFmt.format(transport.arrivalAt)}</dd>
        <dt className="text-[var(--muted-foreground)]">Duración</dt>
        <dd className="text-[var(--ink)]">
          {formatDuration(transport.departureAt, transport.arrivalAt)}
        </dd>
      </dl>

      {transport.imageUrls.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Imágenes</h3>
          <ImageGallery urls={transport.imageUrls} />
        </section>
      )}

      {transport.notesMd.trim() !== "" && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Notas</h3>
          <div className="prose prose-sm max-w-none text-sm text-[var(--body)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {transport.notesMd}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <p className="border-t border-[var(--hairline-soft)] pt-3 text-xs text-[var(--muted-foreground)]">
        Creado: {createdFmt.format(transport.createdAt)}
      </p>
    </div>
  );
}

function CityChip({ label, city }: { label: string; city: VisibleCity }) {
  return (
    <Badge variant="outline" className="text-xs border-[var(--hairline)] text-[var(--ink)]">
      {label}: {city.name}
      {city.countryCode && (
        <span className="ml-1 text-[var(--muted-foreground)]">({city.countryCode})</span>
      )}
    </Badge>
  );
}
