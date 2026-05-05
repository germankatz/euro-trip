"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerAction, type ActionResult } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = { ok: true };

async function formAction(_prev: ActionResult, formData: FormData) {
  return registerAction(formData);
}

export default function RegisterPage() {
  return (
    <main className="min-h-svh grid place-items-center px-4 bg-white">
      <div className="w-full max-w-sm space-y-7">
        <div className="space-y-2 text-center">
          <h1 className="text-[28px] font-bold tracking-[-0.01em] text-[var(--ink)]">
            Crear cuenta
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Registrate para sumarte al viaje.
          </p>
        </div>
        <Suspense fallback={<RegisterFormFallback />}>
          <RegisterFormInner />
        </Suspense>
      </div>
    </main>
  );
}

function RegisterFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
    </div>
  );
}

function RegisterFormInner() {
  const [state, action, pending] = useActionState(formAction, initialState);
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl = rawCallback && rawCallback.startsWith("/") ? rawCallback : "";
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  return (
    <>
      <form action={action} className="space-y-4">
        {callbackUrl && (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>

        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" size="lg" className="w-full h-12 text-[16px]" disabled={pending}>
          {pending ? "Creando…" : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={loginHref}
          className="font-medium text-[var(--ink)] underline underline-offset-4 decoration-[var(--hairline)] hover:decoration-[var(--ink)]"
        >
          Ingresá
        </Link>
      </p>
    </>
  );
}
