"use client";

import { useEffect, useState, useTransition } from "react";
import { Share2, Trash2, Loader2, Copy, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCityInvitationAction,
  listCityInvitationsAction,
  revokeInvitationAction,
  type CityInvitationListItem,
} from "@/lib/actions/invitations";

type Props = {
  city: { id: string; name: string };
};

export function ShareCityButton({ city }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" /> Compartir
      </Button>
      {open && (
        <ShareDialog city={city} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ShareDialog({
  city,
  onClose,
}: {
  city: { id: string; name: string };
  onClose: () => void;
}) {
  const [items, setItems] = useState<CityInvitationListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  async function refresh() {
    const result = await listCityInvitationsAction(city.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setItems(result.data.invitations);
  }

  useEffect(() => {
    refresh();
    // city.id es estable mientras el dialog está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id]);

  function handleCreate() {
    setError(null);
    startCreate(async () => {
      const result = await createCityInvitationAction(city.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir {city.name}</DialogTitle>
          <DialogDescription>
            Cualquiera con el link puede sumarse a esta ciudad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generar nuevo link
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {items === null ? (
            <p className="text-sm text-zinc-500">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Todavía no hay links generados.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border border-zinc-200">
              {items.map((it) => (
                <li key={it.token} className="p-3">
                  <InvitationRow item={it} onRevoked={refresh} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvitationRow({
  item,
  onRevoked,
}: {
  item: CityInvitationListItem;
  onRevoked: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [revoking, startRevoke] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCopy() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/invite/${item.token}`
        : `/invite/${item.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleRevoke() {
    setError(null);
    startRevoke(async () => {
      const result = await revokeInvitationAction(item.token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onRevoked();
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-zinc-100 px-2 py-1 text-xs">
          /invite/{item.token}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRevoke}
          disabled={revoking}
          className="text-red-600 hover:text-red-700"
          aria-label="Revocar"
        >
          {revoking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Creado {formatDate(item.createdAt)}</span>
        <span>
          {item.acceptedAt
            ? `Aceptada por ${item.acceptedByName ?? "alguien"}`
            : "no aceptada todavía"}
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
