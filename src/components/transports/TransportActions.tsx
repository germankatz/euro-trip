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
import { EditTransportDialog } from "@/components/transports/EditTransportDialog";
import {
  archiveTransportAction,
  unarchiveTransportAction,
  deleteTransportAction,
} from "@/lib/actions/transports";
import type { Actor } from "@/lib/permissions";
import {
  canEdit,
  canArchive,
  canUnarchive,
  canDelete,
} from "@/lib/permissions";
import type { VisibleTransport } from "@/lib/trip";

type Props = {
  actor: Actor;
  transport: VisibleTransport;
  onAfterMutation?: () => void;
};

export function TransportActions({ actor, transport, onAfterMutation }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

  const showEdit = canEdit(actor, transport);
  const showArchive = canArchive(actor, transport);
  const showUnarchive = canUnarchive(actor, transport);
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
          <UnarchiveButton transport={transport} onDone={onAfterMutation} />
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

      <EditTransportDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        transport={transport}
      />

      {confirm && (
        <ConfirmDialog
          mode={confirm}
          transport={transport}
          onClose={() => setConfirm(null)}
          onAfterMutation={onAfterMutation}
        />
      )}
    </>
  );
}

function UnarchiveButton({
  transport,
  onDone,
}: {
  transport: VisibleTransport;
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
          const result = await unarchiveTransportAction(transport.id);
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
  transport,
  onClose,
  onAfterMutation,
}: {
  mode: "archive" | "delete";
  transport: VisibleTransport;
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
        ? await deleteTransportAction(transport.id)
        : await archiveTransportAction(transport.id);
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
            {isDelete ? "Eliminar transporte" : "Archivar transporte"}
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? "¿Eliminar definitivamente? Esta acción es irreversible."
              : "¿Archivar este transporte? Podés restaurarlo después."}
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
