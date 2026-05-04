"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityActions } from "@/components/activities/ActivityActions";
import { ImageGallery } from "@/components/forms/ImageGallery";
import type { Actor } from "@/lib/permissions";
import type { VisibleActivity, VisibleCity } from "@/lib/trip";

type Props = {
  activity: VisibleActivity;
  city: VisibleCity;
  actor: Actor;
  onBack: () => void;
  onAfterMutation?: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ActivityDetail({
  activity,
  city,
  actor,
  onBack,
  onAfterMutation,
}: Props) {
  void city;
  return (
    <div className="space-y-4">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onBack}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-xl font-semibold leading-tight">
            {activity.title}
          </h2>
          {activity.archivedAt && (
            <Badge className="bg-amber-100 text-amber-800">archivada</Badge>
          )}
        </div>

        {activity.mapsUrl && (
          <a
            href={activity.mapsUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Ver en Google Maps <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {activity.imageUrls.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-sm font-semibold text-zinc-700">Imágenes</h3>
          <ImageGallery urls={activity.imageUrls} />
        </section>
      )}

      {activity.notesMd.trim().length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-sm font-semibold text-zinc-700">Notas</h3>
          <div className="prose prose-sm max-w-none text-sm text-zinc-800 prose-headings:font-semibold prose-a:text-blue-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activity.notesMd}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <ActivityActions
        actor={actor}
        activity={activity}
        onAfterMutation={onAfterMutation}
      />

      <p className="pt-2 text-xs text-zinc-500">
        Creada: {dateFormatter.format(new Date(activity.createdAt))}
      </p>
    </div>
  );
}
