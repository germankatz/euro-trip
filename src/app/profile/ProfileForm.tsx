"use client";

import { useActionState } from "react";
import { updateProfileAction, type ActionResult } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = { ok: true };

async function formAction(_prev: ActionResult, formData: FormData) {
  return updateProfileAction(formData);
}

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(formAction, initialState);
  const justSaved = state.ok && state !== initialState;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultName}
          required
          maxLength={80}
        />
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {justSaved && (
        <p className="text-sm text-emerald-600">Perfil actualizado.</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-[16px]"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
