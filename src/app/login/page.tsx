"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionResult } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = { ok: true };

async function formAction(_prev: ActionResult, formData: FormData) {
  return loginAction(formData);
}

export default function LoginPage() {
  return (
    <main className="min-h-svh grid place-items-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Ingresar</h1>
          <p className="text-sm text-muted-foreground">
            Accedé con tu cuenta para ver el itinerario.
          </p>
        </div>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginFormInner />
        </Suspense>
      </div>
    </main>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
      <div className="h-9 rounded-md bg-zinc-100 animate-pulse" />
    </div>
  );
}

function LoginFormInner() {
  const [state, action, pending] = useActionState(formAction, initialState);
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl = rawCallback && rawCallback.startsWith("/") ? rawCallback : "";
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <>
      <form action={action} className="space-y-4">
        {callbackUrl && (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        )}
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
            autoComplete="current-password"
            required
          />
        </div>

        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link href={registerHref} className="underline">
          Registrate
        </Link>
      </p>
    </>
  );
}
