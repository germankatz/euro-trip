"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/lib/actions/invitations";

export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.data.redirect);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? "Aceptando…" : "Aceptar"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
