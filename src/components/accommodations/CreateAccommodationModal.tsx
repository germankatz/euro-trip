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
import { createAccommodationAction } from "@/lib/actions/accommodations";
import type { VisibleCity } from "@/lib/trip";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: VisibleCity;
  onCreated?: (id: string) => void;
};

export function CreateAccommodationModal({
  open,
  onOpenChange,
  city,
  onCreated,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar alojamiento en {city.name}</DialogTitle>
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [notesMd, setNotesMd] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
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
      const result = await createAccommodationAction({
        cityId: city.id,
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
      onSuccess(result.data.id);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-acc-title">Título</Label>
        <Input
          id="new-acc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Hotel, Airbnb, casa…"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-acc-start">Check-in</Label>
          <Input
            id="new-acc-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-acc-end">Check-out</Label>
          <Input
            id="new-acc-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-acc-maps">Link de Google Maps (opcional)</Label>
        <Input
          id="new-acc-maps"
          type="url"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          maxLength={500}
          placeholder="https://maps.google.com/..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-acc-notes">Descripción (markdown)</Label>
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
          {pending ? "Creando…" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
