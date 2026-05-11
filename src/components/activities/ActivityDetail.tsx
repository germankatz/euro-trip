"use client";

import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/ui/detail-header";
import { ActivityActions } from "@/components/activities/ActivityActions";
import { ActivityReactions } from "@/components/activities/ActivityReactions";
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
    <div className="space-y-5">
      <DetailHeader
        onBack={onBack}
        title={activity.title}
        meta={
          <>
            {activity.archivedAt && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                archivada
              </Badge>
            )}
            {activity.mapsUrl && (
              <a
                href={activity.mapsUrl}
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
          <ActivityActions
            actor={actor}
            activity={activity}
            onAfterMutation={onAfterMutation}
          />
        }
      />

      {activity.imageUrls.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Imágenes</h3>
          <ImageGallery urls={activity.imageUrls} />
        </section>
      )}

      {activity.notesMd.trim().length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Notas</h3>
          <div className="prose prose-sm max-w-none text-sm text-[var(--body)] prose-headings:font-semibold prose-a:text-[var(--ink)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activity.notesMd}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <section className="space-y-1.5">
        <h3 className="text-[15px] font-semibold text-[var(--ink)]">Reacciones</h3>
        <ActivityReactions
          activityId={activity.id}
          reactions={activity.reactions}
          currentUserId={actor.userId}
          isMember={actor.isTripMember}
        />
      </section>

      <p className="border-t border-[var(--hairline-soft)] pt-3 text-xs text-[var(--muted-foreground)]">
        Creada: {dateFormatter.format(new Date(activity.createdAt))}
      </p>
    </div>
  );
}
