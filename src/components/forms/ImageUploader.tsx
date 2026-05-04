"use client";

import { useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  disabled?: boolean;
};

const DEFAULT_MAX = 8;

export function ImageUploader({
  value,
  onChange,
  max = DEFAULT_MAX,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(filesRaw: FileList | null) {
    if (!filesRaw || filesRaw.length === 0) return;
    const files = Array.from(filesRaw);
    if (value.length + files.length > max) {
      setError(`Máximo ${max} imágenes.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = (await res.json()) as { urls?: string[]; message?: string; error?: string };
      if (!res.ok) {
        setError(json.message ?? json.error ?? "No se pudo subir.");
        return;
      }
      onChange([...value, ...(json.urls ?? [])]);
    } catch {
      setError("Error de red al subir las imágenes.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <Reorder.Group
        axis="x"
        values={value}
        onReorder={onChange}
        className="flex flex-wrap gap-2"
      >
        {value.map((url, i) => (
          <Reorder.Item
            key={url}
            value={url}
            style={{ touchAction: "none" }}
            whileDrag={{ scale: 1.05, zIndex: 10 }}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-zinc-200 cursor-grab active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Imagen ${i + 1}`}
              className="h-full w-full object-cover pointer-events-none"
              draggable={false}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label={`Quitar imagen ${i + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Reorder.Item>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className={cn(
              "h-20 w-20 shrink-0 grid place-items-center rounded-md border-2 border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 transition-colors",
              (disabled || uploading) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Subir imágenes"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
        )}
      </Reorder.Group>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
      {value.length > 0 && (
        <p className="text-xs text-zinc-500">
          {value.length} / {max} imágenes — arrastrá para reordenar.
        </p>
      )}
    </div>
  );
}
