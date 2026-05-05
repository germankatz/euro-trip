"use client";

import { useState, useTransition } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
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
  const [unarchivePending, startUnarchive] = useTransition();

  const showEdit = canEdit(actor, activity);
  const showArchive = canArchive(actor, activity);
  const showUnarchive = canUnarchive(actor, activity);
  const showDelete = canDelete(actor);

  if (!showEdit && !showArchive && !showUnarchive && !showDelete) return null;

  function handleUnarchive() {
    startUnarchive(async () => {
      const result = await unarchiveActivityAction(activity.id);
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
            {isDelete ? "Eliminar" : "Archivar"} &quot;{activity.title}&quot;
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
