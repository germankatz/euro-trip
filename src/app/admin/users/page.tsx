import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UsersAdminTable } from "./UsersAdminTable";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/users");
  if (session.user.role !== "seed") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <main className="min-h-svh px-4 py-8 bg-white">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[var(--ink)]"
        >
          <ChevronLeft className="h-4 w-4" /> Volver al viaje
        </Link>
        <div className="space-y-1">
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--ink)]">
            Usuarios
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Panel admin: resetear contraseñas de los miembros del viaje.
          </p>
        </div>
        <UsersAdminTable users={users} currentUserId={session.user.id} />
      </div>
    </main>
  );
}
