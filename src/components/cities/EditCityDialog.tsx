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
import { updateCityAction } from "@/lib/actions/cities";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: { id: string; name: string; countryCode: string | null };
};

export function EditCityDialog({ open, onOpenChange, city }: Props) {
  const [name, setName] = useState(city.name);
  const [countryCode, setCountryCode] = useState(city.countryCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCityAction({
        id: city.id,
        name: name.trim(),
        countryCode: countryCode.trim() || undefined,
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
          <DialogTitle>Editar ciudad</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="city-name">Nombre</Label>
            <Input
              id="city-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city-cc">Código de país (ISO-2, opcional)</Label>
            <Input
              id="city-cc"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="DE"
              className="uppercase"
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
