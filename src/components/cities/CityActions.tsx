"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KebabButton } from "@/components/ui/kebab-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditCityDialog } from "@/components/cities/EditCityDialog";
import { ShareDialog } from "@/components/cities/ShareCityButton";
import {
  archiveCityAction,
  unarchiveCityAction,
  deleteCityAction,
  countCityCascade,
} from "@/lib/actions/cities";
import type { Actor } from "@/lib/permissions";
import {
  canEdit,
  canArchive,
  canUnarchive,
  canDelete,
} from "@/lib/permissions";

type CityForActions = {
  id: string;
  name: string;
  countryCode: string | null;
  createdById: string;
  archivedAt: Date | null;
  visibility: "shared" | "group";
};

type Props = {
  actor: Actor;
  city: CityForActions;
  /** Callback luego de archivar/eliminar (para cerrar el detalle) */
  onAfterMutation?: () => void;
};

export function CityActions({ actor, city, onAfterMutation }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [unarchivePending, startUnarchive] = useTransition();

  const showEdit = canEdit(actor, city);
  const showArchive = canArchive(actor, city);
  const showUnarchive = canUnarchive(actor, city);
  const showDelete = canDelete(actor);
  const showShare =
    city.visibility === "group" &&
    !city.archivedAt &&
    (actor.role === "seed" || actor.isTripMember);

  if (
    !showEdit &&
    !showArchive &&
    !showUnarchive &&
    !showDelete &&
    !showShare
  ) {
    return null;
  }

  function handleUnarchive() {
    startUnarchive(async () => {
      const result = await unarchiveCityAction(city.id);
      if (result.ok) onAfterMutation?.();
      else alert(result.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<KebabButton />} />
        <DropdownMenuContent align="end" className="min-w-40">
          {showEdit && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil /> Editar
            </DropdownMenuItem>
          )}
          {showShare && (
            <DropdownMenuItem onClick={() => setShareOpen(true)}>
              <Share2 /> Compartir
            </DropdownMenuItem>
          )}
          {showArchive && (
            <DropdownMenuItem onClick={() => setConfirm("archive")}>
              <Archive /> Archivar
            </DropdownMenuItem>
          )}
          {showUnarchive && (
            <DropdownMenuItem
              onClick={handleUnarchive}
              disabled={unarchivePending}
            >
              <ArchiveRestore />
              {unarchivePending ? "Desarchivando…" : "Desarchivar"}
            </DropdownMenuItem>
          )}
          {showDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirm("delete")}
            >
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCityDialog open={editOpen} onOpenChange={setEditOpen} city={city} />

      {shareOpen && (
        <ShareDialog city={city} onClose={() => setShareOpen(false)} />
      )}

      {confirm && (
        <CascadeConfirmDialog
          mode={confirm}
          city={city}
          onClose={() => setConfirm(null)}
          onAfterMutation={onAfterMutation}
        />
      )}
    </>
  );
}

function CascadeConfirmDialog({
  mode,
  city,
  onClose,
  onAfterMutation,
}: {
  mode: "archive" | "delete";
  city: CityForActions;
  onClose: () => void;
  onAfterMutation?: () => void;
}) {
  const [counts, setCounts] = useState<{ activities: number; transports: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    countCityCascade(city.id).then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => {
      cancelled = true;
    };
  }, [city.id]);

  const isDelete = mode === "delete";

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = isDelete
        ? await deleteCityAction(city.id)
        : await archiveCityAction(city.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      onAfterMutation?.();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDelete ? "Eliminar" : "Archivar"} &quot;{city.name}&quot;
          </DialogTitle>
          <DialogDescription>
            {counts === null ? (
              "Calculando impacto…"
            ) : (
              <>
                Esto {isDelete ? "elimina permanentemente" : "archiva"} la ciudad
                {countsText(counts) && <> y {countsText(counts)}</>}.
                {isDelete && (
                  <span className="block mt-2 text-red-600 text-sm">
                    Acción irreversible. Los transports linkeados quedan sin
                    referencia (su origen/destino pasa a ser solo geográfico).
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={pending || counts === null}
            className={isDelete ? "bg-red-600 hover:bg-red-700" : undefined}
          >
            {pending
              ? "Procesando…"
              : isDelete
                ? "Eliminar definitivamente"
                : "Archivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function countsText(c: { activities: number; transports: number }): string | null {
  const parts: string[] = [];
  if (c.activities > 0)
    parts.push(`${c.activities} actividad${c.activities === 1 ? "" : "es"}`);
  if (c.transports > 0)
    parts.push(`${c.transports} transporte${c.transports === 1 ? "" : "s"}`);
  if (parts.length === 0) return null;
  return parts.join(" + ");
}
