import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/change-password");

  return (
    <main className="min-h-svh px-4 py-8 bg-white">
      <div className="w-full max-w-sm mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[var(--ink)]"
        >
          <ChevronLeft className="h-4 w-4" /> Volver al viaje
        </Link>
        <div className="space-y-1">
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--ink)]">
            Cambiar contraseña
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Ingresá tu contraseña actual y la nueva.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
