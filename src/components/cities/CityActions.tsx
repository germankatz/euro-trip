"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditCityDialog } from "@/components/cities/EditCityDialog";
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
};

type Props = {
  actor: Actor;
  city: CityForActions;
  /** Callback luego de archivar/eliminar (para cerrar el detalle) */
  onAfterMutation?: () => void;
};

export function CityActions({ actor, city, onAfterMutation }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

  const showEdit = canEdit(actor, city);
  const showArchive = canArchive(actor, city);
  const showUnarchive = canUnarchive(actor, city);
  const showDelete = canDelete(actor);

  if (!showEdit && !showArchive && !showUnarchive && !showDelete) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        )}
        {showArchive && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirm("archive")}
          >
            <Archive className="h-4 w-4" /> Archivar
          </Button>
        )}
        {showUnarchive && (
          <UnarchiveButton city={city} onDone={onAfterMutation} />
        )}
        {showDelete && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirm("delete")}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        )}
      </div>

      <EditCityDialog open={editOpen} onOpenChange={setEditOpen} city={city} />

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

function UnarchiveButton({
  city,
  onDone,
}: {
  city: CityForActions;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await unarchiveCityAction(city.id);
          if (result.ok) onDone?.();
          else alert(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
      Desarchivar
    </Button>
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
            {isDelete ? "Eliminar" : "Archivar"} "{city.name}"
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
