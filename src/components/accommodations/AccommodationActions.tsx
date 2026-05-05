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
import { EditAccommodationDialog } from "@/components/accommodations/EditAccommodationDialog";
import {
  archiveAccommodationAction,
  unarchiveAccommodationAction,
  deleteAccommodationAction,
} from "@/lib/actions/accommodations";
import type { Actor } from "@/lib/permissions";
import {
  canEdit,
  canArchive,
  canUnarchive,
  canDelete,
} from "@/lib/permissions";
import type { VisibleAccommodation } from "@/lib/trip";

type Props = {
  actor: Actor;
  accommodation: VisibleAccommodation;
  onAfterMutation?: () => void;
};

export function AccommodationActions({ actor, accommodation, onAfterMutation }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [unarchivePending, startUnarchive] = useTransition();

  const showEdit = canEdit(actor, accommodation);
  const showArchive = canArchive(actor, accommodation);
  const showUnarchive = canUnarchive(actor, accommodation);
  const showDelete = canDelete(actor);

  if (!showEdit && !showArchive && !showUnarchive && !showDelete) return null;

  function handleUnarchive() {
    startUnarchive(async () => {
      const result = await unarchiveAccommodationAction(accommodation.id);
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

      <EditAccommodationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        accommodation={accommodation}
      />

      {confirm && (
        <ConfirmDialog
          mode={confirm}
          accommodation={accommodation}
          onClose={() => setConfirm(null)}
          onAfterMutation={onAfterMutation}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  mode,
  accommodation,
  onClose,
  onAfterMutation,
}: {
  mode: "archive" | "delete";
  accommodation: VisibleAccommodation;
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
        ? await deleteAccommodationAction(accommodation.id)
        : await archiveAccommodationAction(accommodation.id);
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
            {isDelete ? "Eliminar" : "Archivar"} &quot;{accommodation.title}&quot;
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? "¿Eliminar definitivamente? No se puede deshacer."
              : "¿Archivar este alojamiento?"}
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
