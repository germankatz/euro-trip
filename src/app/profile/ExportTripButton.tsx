"use client";

import { useState, useRef } from "react";
import { FileDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ExportTripButton() {
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleOpen() {
    setLoading(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Error al exportar");
      const text = await res.text();
      setMarkdown(text);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) setMarkdown(null);
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 text-[16px] gap-2"
        onClick={handleOpen}
        disabled={loading}
      >
        <FileDown className="h-4 w-4" />
        {loading ? "Cargando…" : "Exportar .md"}
      </Button>

      <Dialog open={markdown !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl flex flex-col gap-4 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Viaje en Markdown</DialogTitle>
          </DialogHeader>
          <textarea
            ref={textareaRef}
            readOnly
            value={markdown ?? ""}
            onClick={() => textareaRef.current?.select()}
            className="flex-1 min-h-[400px] resize-none rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-zinc-400 overflow-auto"
          />
          <Button
            size="lg"
            className="w-full h-12 text-[16px] gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
