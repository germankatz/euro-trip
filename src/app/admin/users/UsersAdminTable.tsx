"use client";

import { useState, useTransition } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetUserPasswordAction, type AdminUserRow } from "@/lib/actions/admin";

export function UsersAdminTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [target, setTarget] = useState<AdminUserRow | null>(null);

  return (
    <>
      <ul className="divide-y rounded-lg border border-zinc-200">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          const isOtherSeed = u.role === "seed" && !isSelf;
          return (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 px-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{u.name}</span>
                  {u.role === "seed" && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-600 font-medium">
                      seed
                    </span>
                  )}
                  {isSelf && (
                    <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                      vos
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 truncate">{u.email}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isOtherSeed}
                onClick={() => setTarget(u)}
              >
                <KeyRound className="h-4 w-4" /> Resetear
              </Button>
            </li>
          );
        })}
      </ul>

      {target && (
        <ResetPasswordDialog
          user={target}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    if (pwd.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await resetUserPasswordAction({
        userId: user.id,
        newPassword: pwd,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resetear contraseña</DialogTitle>
          <DialogDescription>
            Asignás una nueva contraseña para <strong>{user.name}</strong> ({user.email}).
            El usuario podrá ingresar inmediatamente con esta contraseña.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600">
              Contraseña actualizada. Compartila por un canal seguro.
            </p>
            <Button type="button" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="text"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                minLength={8}
                autoComplete="off"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="button"
              onClick={submit}
              disabled={pending}
              className="w-full"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : (
                "Resetear"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
