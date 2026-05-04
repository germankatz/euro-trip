"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  canCreate,
  canEdit,
  canArchive,
  canUnarchive,
  canDelete,
  type Actor,
} from "@/lib/permissions";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const createSchema = z.object({
  cityId: z.string().min(1),
  title: z.string().min(1).max(200),
  mapsUrl: z
    .string()
    .url()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notesMd: z.string().max(20000).default(""),
});

const updateSchema = createSchema.extend({
  id: z.string().min(1),
}).omit({ cityId: true });

async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user) return null;
  const trip = await prisma.trip.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!trip) return null;
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: session.user.id } },
    select: { id: true },
  });
  return {
    userId: session.user.id,
    role: session.user.role,
    isTripMember: !!member || session.user.role === "seed",
  };
}

export async function createActivityAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  const actor = await getActor();
  if (!actor || !canCreate(actor)) {
    return { ok: false, error: "Sin permisos para crear actividades." };
  }

  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  // Verificar que la city existe (no chequeo membership aquí: si el user
  // logró abrir el detalle de la city ya pasó el filtro de visibility).
  const city = await prisma.city.findUnique({
    where: { id: parsed.data.cityId },
    select: { id: true },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };

  const activity = await prisma.activity.create({
    data: {
      cityId: parsed.data.cityId,
      title: parsed.data.title,
      mapsUrl: parsed.data.mapsUrl,
      notesMd: parsed.data.notesMd,
      createdById: actor.userId,
    },
    select: { id: true },
  });
  revalidatePath("/");
  return { ok: true, data: { id: activity.id } };
}

export async function updateActivityAction(
  rawInput: unknown
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const parsed = updateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const existing = await prisma.activity.findUnique({
    where: { id: parsed.data.id },
    select: { createdById: true, archivedAt: true },
  });
  if (!existing) return { ok: false, error: "Actividad no encontrada." };
  if (!canEdit(actor, existing)) {
    return { ok: false, error: "Solo el autor o el seed pueden editar." };
  }

  await prisma.activity.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      mapsUrl: parsed.data.mapsUrl,
      notesMd: parsed.data.notesMd,
    },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function archiveActivityAction(
  activityId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };
  const a = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { createdById: true, archivedAt: true },
  });
  if (!a) return { ok: false, error: "Actividad no encontrada." };
  if (!canArchive(actor, a)) {
    return { ok: false, error: "Sin permisos para archivar." };
  }
  await prisma.activity.update({
    where: { id: activityId },
    data: { archivedAt: new Date(), archivedById: actor.userId },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function unarchiveActivityAction(
  activityId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };
  const a = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { createdById: true, archivedAt: true },
  });
  if (!a) return { ok: false, error: "Actividad no encontrada." };
  if (!canUnarchive(actor, a)) {
    return { ok: false, error: "Sin permisos para desarchivar." };
  }
  await prisma.activity.update({
    where: { id: activityId },
    data: { archivedAt: null, archivedById: null },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteActivityAction(
  activityId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || !canDelete(actor)) {
    return { ok: false, error: "Solo el seed puede eliminar." };
  }
  await prisma.activity.delete({ where: { id: activityId } });
  revalidatePath("/");
  return { ok: true, data: undefined };
}
