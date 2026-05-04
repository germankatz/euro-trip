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
import { createActivityAction } from "@/lib/actions/activities";
import type { VisibleCity } from "@/lib/trip";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: VisibleCity;
  onCreated?: (id: string) => void;
};

export function CreateActivityModal({
  open,
  onOpenChange,
  city,
  onCreated,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar actividad en {city.name}</DialogTitle>
        </DialogHeader>
        <Form
          city={city}
          onSuccess={(id) => {
            onOpenChange(false);
            onCreated?.(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Form({
  city,
  onSuccess,
}: {
  city: VisibleCity;
  onSuccess: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [notesMd, setNotesMd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createActivityAction({
        cityId: city.id,
        title: title.trim(),
        mapsUrl: mapsUrl.trim() || undefined,
        notesMd,
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
        <Label htmlFor="new-activity-title">Título</Label>
        <Input
          id="new-activity-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-activity-maps">Link de Google Maps (opcional)</Label>
        <Input
          id="new-activity-maps"
          type="url"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          maxLength={500}
          placeholder="https://maps.google.com/..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-activity-notes">Notas (markdown)</Label>
        <textarea
          id="new-activity-notes"
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
          {pending ? "Creando…" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
