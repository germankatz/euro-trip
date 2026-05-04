"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GeoResult } from "@/lib/geocode";

type Props = {
  value: GeoResult | null;
  onChange: (value: GeoResult | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

const DEBOUNCE_MS = 400;

export function CitySearchInput({ value, onChange, placeholder, autoFocus }: Props) {
  const [text, setText] = useState(value?.name ?? "");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Map<string, GeoResult[]>>(new Map());

  // Sincronizar el texto si el value externo cambia (ej: edit precargado).
  useEffect(() => {
    setText(value?.name ?? "");
  }, [value]);

  // Cerrar el dropdown al clickear afuera.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced fetch.
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (value && q === value.name) {
      // El user no cambió nada después de seleccionar; no buscamos de nuevo.
      return;
    }

    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) {
      setResults(cached);
      setLoading(false);
      setError(null);
      setOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { results: GeoResult[] };
        cacheRef.current.set(q.toLowerCase(), json.results);
        setResults(json.results);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("No se pudo buscar. Probá de nuevo.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function handleSelect(r: GeoResult) {
    onChange(r);
    setText(r.name);
    setOpen(false);
  }

  function handleChangeText(v: string) {
    setText(v);
    if (value) onChange(null); // invalidar selección si el user vuelve a tipear
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={text}
        onChange={(e) => handleChangeText(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "Ej: Berlin"}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
      />

      {open && (results.length > 0 || loading || error) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-zinc-500">Buscando…</div>
          )}
          {error && (
            <div className="px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500">
              Sin resultados.
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              type="button"
              onClick={() => handleSelect(r)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50",
                value?.lat === r.lat && value?.lng === r.lng && "bg-zinc-100"
              )}
            >
              <span className="font-medium">
                {r.countryCode && (
                  <span className="mr-1.5" aria-hidden>
                    {flagEmoji(r.countryCode)}
                  </span>
                )}
                {r.name}
              </span>
              <span className="text-xs text-zinc-500 line-clamp-1">
                {r.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function flagEmoji(cc: string): string {
  const u = cc.toUpperCase();
  if (u.length !== 2) return "";
  return String.fromCodePoint(
    0x1f1e6 + (u.charCodeAt(0) - 0x41),
    0x1f1e6 + (u.charCodeAt(1) - 0x41)
  );
}
