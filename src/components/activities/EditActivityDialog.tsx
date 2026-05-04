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
import { updateActivityAction } from "@/lib/actions/activities";
import type { VisibleActivity } from "@/lib/trip";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: VisibleActivity;
};

export function EditActivityDialog({ open, onOpenChange, activity }: Props) {
  const [title, setTitle] = useState(activity.title);
  const [mapsUrl, setMapsUrl] = useState(activity.mapsUrl ?? "");
  const [notesMd, setNotesMd] = useState(activity.notesMd);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateActivityAction({
        id: activity.id,
        title: title.trim(),
        mapsUrl: mapsUrl.trim() || undefined,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar actividad</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="activity-title">Título</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-maps">Link de Google Maps (opcional)</Label>
            <Input
              id="activity-maps"
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              maxLength={500}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-notes">Notas (markdown)</Label>
            <textarea
              id="activity-notes"
              value={notesMd}
              onChange={(e) => setNotesMd(e.target.value)}
              maxLength={20000}
              rows={6}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-zinc-400"
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
