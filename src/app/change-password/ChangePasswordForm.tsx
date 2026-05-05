"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePasswordAction, type ActionResult } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = { ok: true };

async function formAction(_prev: ActionResult, formData: FormData) {
  return changePasswordAction(formData);
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(formAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const justSaved = state.ok && state !== initialState;

  useEffect(() => {
    if (justSaved) formRef.current?.reset();
  }, [justSaved]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Contraseña actual</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Repetir nueva contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {justSaved && (
        <p className="text-sm text-emerald-600">Contraseña actualizada.</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-[16px]"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
