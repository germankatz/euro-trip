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
  name: z.string().min(1).max(120),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  countryCode: z
    .string()
    .length(2)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  visibility: z.enum(["shared", "group"]),
  // Solo se usa cuando visibility === "group".
  position: z.enum(["before", "after"]).optional(),
  // Solo aplica a group: ids de TripMembers a sumar como CityMember
  // además del creador (que se agrega automáticamente).
  inviteUserIds: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  countryCode: z
    .string()
    .length(2)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

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

export async function createCityAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  const actor = await getActor();
  if (!actor || !canCreate(actor)) {
    return { ok: false, error: "Sin permisos para crear ciudades." };
  }

  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const input = parsed.data;
  if (input.visibility === "group" && !input.position) {
    return { ok: false, error: "Las ciudades grupo necesitan una posición." };
  }

  const trip = await prisma.trip.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!trip) return { ok: false, error: "Trip no encontrado." };

  // Calcular el `order` respetando el invariant:
  // - shared → al final del bloque shared (max(shared.order) + 1)
  // - group "before" → antes del primer order conocido (min(any) - 1)
  // - group "after" → después del último order conocido (max(any) + 1)
  const allOrders = await prisma.city.findMany({
    where: { tripId: trip.id },
    select: { order: true, visibility: true },
  });
  const sharedOrders = allOrders
    .filter((c) => c.visibility === "shared")
    .map((c) => c.order);
  const minAny = allOrders.length ? Math.min(...allOrders.map((c) => c.order)) : 0;
  const maxAny = allOrders.length ? Math.max(...allOrders.map((c) => c.order)) : -1;
  const maxShared = sharedOrders.length ? Math.max(...sharedOrders) : -1;

  let order: number;
  if (input.visibility === "shared") {
    if (maxShared >= 0) order = maxShared + 1;
    else order = allOrders.length ? minAny - 1 : 0;
    // Nota: si insertamos shared y ya hay un group "after" más adelante,
    // el max(shared)+1 podría chocar. La unique (tripId, order) lo protegería
    // pero no debería ocurrir si los grupos siempre quedan fuera del bloque.
    // Por las dudas, validamos colisión en runtime y ajustamos.
    while (allOrders.some((c) => c.order === order)) order++;
  } else if (input.position === "before") {
    order = minAny - 1;
  } else {
    order = maxAny + 1;
  }

  // Validar usuarios a invitar: deben ser TripMembers del trip.
  let inviteUserIds: string[] = [];
  if (input.visibility === "group" && input.inviteUserIds.length) {
    const validMembers = await prisma.tripMember.findMany({
      where: {
        tripId: trip.id,
        userId: { in: input.inviteUserIds.filter((id) => id !== actor.userId) },
      },
      select: { userId: true },
    });
    inviteUserIds = validMembers.map((m) => m.userId);
  }

  const city = await prisma.$transaction(async (tx) => {
    const city = await tx.city.create({
      data: {
        tripId: trip.id,
        name: input.name,
        lat: input.lat,
        lng: input.lng,
        countryCode: input.countryCode,
        visibility: input.visibility,
        order,
        createdById: actor.userId,
      },
    });
    if (input.visibility === "group") {
      // Creator + invitados, sin duplicados.
      const memberIds = Array.from(new Set([actor.userId, ...inviteUserIds]));
      await tx.cityMember.createMany({
        data: memberIds.map((userId) => ({ cityId: city.id, userId })),
        skipDuplicates: true,
      });
    }
    return city;
  });

  revalidatePath("/");
  return { ok: true, data: { id: city.id } };
}

export async function updateCityAction(
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

  const city = await prisma.city.findUnique({
    where: { id: parsed.data.id },
    select: { createdById: true, archivedAt: true },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };
  if (!canEdit(actor, city)) {
    return { ok: false, error: "Solo el autor o el seed pueden editar." };
  }

  await prisma.city.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      countryCode: parsed.data.countryCode,
    },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function archiveCityAction(cityId: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { createdById: true, archivedAt: true },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };
  if (!canArchive(actor, city)) {
    return { ok: false, error: "Sin permisos para archivar." };
  }

  // Cascade soft-delete: todas las activities + transports linkeados.
  const now = new Date();
  await prisma.$transaction([
    prisma.city.update({
      where: { id: cityId },
      data: { archivedAt: now, archivedById: actor.userId },
    }),
    prisma.activity.updateMany({
      where: { cityId, archivedAt: null },
      data: { archivedAt: now, archivedById: actor.userId },
    }),
    prisma.transport.updateMany({
      where: {
        archivedAt: null,
        OR: [{ fromCityId: cityId }, { toCityId: cityId }],
      },
      data: { archivedAt: now, archivedById: actor.userId },
    }),
  ]);

  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function unarchiveCityAction(
  cityId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { createdById: true, archivedAt: true },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };
  if (!canUnarchive(actor, city)) {
    return { ok: false, error: "Sin permisos para desarchivar." };
  }

  // Solo desarchivamos la City; los hijos quedan archivados (el user
  // puede desarchivarlos uno a uno si quiere). Esto es deliberado para
  // no resucitar datos por accidente.
  await prisma.city.update({
    where: { id: cityId },
    data: { archivedAt: null, archivedById: null },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteCityAction(cityId: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || !canDelete(actor)) {
    return { ok: false, error: "Solo el seed puede eliminar." };
  }
  // El cascade lo maneja Prisma onDelete (Cascade en Activities + CityMembers,
  // SetNull en Transport.fromCityId/toCityId).
  await prisma.city.delete({ where: { id: cityId } });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

/** Devuelve cuántos hijos se verán afectados al archivar/eliminar una city. */
export async function countCityCascade(
  cityId: string
): Promise<{ activities: number; transports: number }> {
  const [activities, transports] = await Promise.all([
    prisma.activity.count({ where: { cityId, archivedAt: null } }),
    prisma.transport.count({
      where: {
        archivedAt: null,
        OR: [{ fromCityId: cityId }, { toCityId: cityId }],
      },
    }),
  ]);
  return { activities, transports };
}
