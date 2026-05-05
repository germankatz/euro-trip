"use client";

import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/ui/detail-header";
import { AccommodationActions } from "@/components/accommodations/AccommodationActions";
import { ImageGallery } from "@/components/forms/ImageGallery";
import type { Actor } from "@/lib/permissions";
import type { VisibleAccommodation, VisibleCity } from "@/lib/trip";
import { formatStayLong, nightsBetween } from "./accommodation-shared";

type Props = {
  accommodation: VisibleAccommodation;
  city: VisibleCity;
  actor: Actor;
  onBack: () => void;
  onAfterMutation?: () => void;
};

const createdFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AccommodationDetail({
  accommodation,
  city,
  actor,
  onBack,
  onAfterMutation,
}: Props) {
  void city;
  const start = new Date(accommodation.startDate);
  const end = new Date(accommodation.endDate);
  const nights = nightsBetween(start, end);
  return (
    <div className="space-y-5">
      <DetailHeader
        onBack={onBack}
        title={accommodation.title}
        meta={
          <>
            {accommodation.archivedAt && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                archivado
              </Badge>
            )}
            {accommodation.mapsUrl && (
              <a
                href={accommodation.mapsUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-sm text-[var(--ink)] underline underline-offset-4 decoration-[var(--hairline)] hover:decoration-[var(--ink)]"
              >
                Ver en Maps <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        }
        actions={
          <AccommodationActions
            actor={actor}
            accommodation={accommodation}
            onAfterMutation={onAfterMutation}
          />
        }
      />

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-[var(--muted-foreground)]">Check-in</dt>
        <dd className="text-[var(--ink)]">{formatStayLong(start)}</dd>
        <dt className="text-[var(--muted-foreground)]">Check-out</dt>
        <dd className="text-[var(--ink)]">{formatStayLong(end)}</dd>
        {nights > 0 && (
          <>
            <dt className="text-[var(--muted-foreground)]">Noches</dt>
            <dd className="text-[var(--ink)]">{nights}</dd>
          </>
        )}
      </dl>

      {accommodation.imageUrls.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Imágenes</h3>
          <ImageGallery urls={accommodation.imageUrls} />
        </section>
      )}

      {accommodation.notesMd.trim().length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Descripción</h3>
          <div className="prose prose-sm max-w-none text-sm text-[var(--body)] prose-headings:font-semibold prose-a:text-[var(--ink)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {accommodation.notesMd}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <p className="border-t border-[var(--hairline-soft)] pt-3 text-xs text-[var(--muted-foreground)]">
        Creado: {createdFmt.format(new Date(accommodation.createdAt))}
      </p>
    </div>
  );
}
