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
import { MarkdownInput } from "@/components/forms/MarkdownInput";
import { ImageUploader } from "@/components/forms/ImageUploader";
import { updateAccommodationAction } from "@/lib/actions/accommodations";
import type { VisibleAccommodation } from "@/lib/trip";
import { toDateInputValue } from "./accommodation-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accommodation: VisibleAccommodation;
};

export function EditAccommodationDialog({
  open,
  onOpenChange,
  accommodation,
}: Props) {
  const [title, setTitle] = useState(accommodation.title);
  const [startDate, setStartDate] = useState(
    toDateInputValue(new Date(accommodation.startDate))
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(new Date(accommodation.endDate))
  );
  const [mapsUrl, setMapsUrl] = useState(accommodation.mapsUrl ?? "");
  const [notesMd, setNotesMd] = useState(accommodation.notesMd);
  const [imageUrls, setImageUrls] = useState<string[]>(
    accommodation.imageUrls ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Fechas inválidas.");
      return;
    }
    if (end < start) {
      setError("La fecha de fin no puede ser antes del inicio.");
      return;
    }

    startTransition(async () => {
      const result = await updateAccommodationAction({
        id: accommodation.id,
        title: title.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        mapsUrl: mapsUrl.trim() || undefined,
        notesMd,
        imageUrls,
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
          <DialogTitle>Editar alojamiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-title">Título</Label>
            <Input
              id="acc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-start">Check-in</Label>
              <Input
                id="acc-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-end">Check-out</Label>
              <Input
                id="acc-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-maps">Link de Google Maps (opcional)</Label>
            <Input
              id="acc-maps"
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              maxLength={500}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-notes">Descripción (markdown)</Label>
            <MarkdownInput
              value={notesMd}
              onChange={setNotesMd}
              height={220}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Imágenes</Label>
            <ImageUploader value={imageUrls} onChange={setImageUrls} />
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
