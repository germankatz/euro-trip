"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: "seed" | "member";
  createdAt: Date;
};

async function requireSeed(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sin sesión." };
  if (session.user.role !== "seed") return { ok: false, error: "Solo el admin." };
  return { ok: true, userId: session.user.id };
}

export async function listUsersAction(): Promise<ActionResult<{ users: AdminUserRow[] }>> {
  const guard = await requireSeed();
  if (!guard.ok) return { ok: false, error: guard.error };

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return { ok: true, data: { users: rows } };
}

const resetSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function resetUserPasswordAction(input: {
  userId: string;
  newPassword: string;
}): Promise<ActionResult> {
  const guard = await requireSeed();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { ok: false, error: first };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, error: "Usuario no encontrado." };
  if (target.role === "seed" && target.id !== guard.userId) {
    return { ok: false, error: "No se puede resetear la contraseña de otro seed." };
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash },
  });

  revalidatePath("/admin/users");
  return { ok: true, data: undefined };
}
