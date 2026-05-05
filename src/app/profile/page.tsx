import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");

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
            Perfil
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Editá tu información de cuenta.
          </p>
        </div>
        <ProfileForm
          defaultName={session.user.name ?? ""}
          email={session.user.email ?? ""}
        />
      </div>
    </main>
  );
}
