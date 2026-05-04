"use client";

import { useState, useTransition } from "react";
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
import { EditActivityDialog } from "@/components/activities/EditActivityDialog";
import {
  archiveActivityAction,
  unarchiveActivityAction,
  deleteActivityAction,
} from "@/lib/actions/activities";
import type { Actor } from "@/lib/permissions";
import {
  canEdit,
  canArchive,
  canUnarchive,
  canDelete,
} from "@/lib/permissions";
import type { VisibleActivity } from "@/lib/trip";

type Props = {
  actor: Actor;
  activity: VisibleActivity;
  /** Callback luego de archivar/eliminar (para cerrar el detalle) */
  onAfterMutation?: () => void;
};

export function ActivityActions({ actor, activity, onAfterMutation }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

  const showEdit = canEdit(actor, activity);
  const showArchive = canArchive(actor, activity);
  const showUnarchive = canUnarchive(actor, activity);
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
          <UnarchiveButton activity={activity} onDone={onAfterMutation} />
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

      <EditActivityDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        activity={activity}
      />

      {confirm && (
        <ConfirmDialog
          mode={confirm}
          activity={activity}
          onClose={() => setConfirm(null)}
          onAfterMutation={onAfterMutation}
        />
      )}
    </>
  );
}

function UnarchiveButton({
  activity,
  onDone,
}: {
  activity: VisibleActivity;
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
          const result = await unarchiveActivityAction(activity.id);
          if (result.ok) onDone?.();
          else alert(result.error);
        });
      }}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArchiveRestore className="h-4 w-4" />
      )}
      Desarchivar
    </Button>
  );
}

function ConfirmDialog({
  mode,
  activity,
  onClose,
  onAfterMutation,
}: {
  mode: "archive" | "delete";
  activity: VisibleActivity;
  onClose: () => void;
  onAfterMutation?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDelete = mode === "delete";

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = isDelete
        ? await deleteActivityAction(activity.id)
        : await archiveActivityAction(activity.id);
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
            {isDelete ? "Eliminar" : "Archivar"} "{activity.title}"
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? "¿Eliminar definitivamente? No se puede deshacer."
              : "¿Archivar esta actividad?"}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={pending}
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
