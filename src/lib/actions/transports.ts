"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findClosestCity } from "@/lib/cityMatch";
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

const TRANSPORT_MODES = ["plane", "bus", "train", "car", "ferry", "other"] as const;

const cityCreateSchema = z.object({
  visibility: z.enum(["shared", "group"]),
  position: z.enum(["before", "after"]).optional(),
});

const baseTransportSchema = z.object({
  fromName: z.string().min(1).max(200),
  fromLat: z.number().gte(-90).lte(90),
  fromLng: z.number().gte(-180).lte(180),
  fromCountryCode: z
    .string()
    .length(2)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  toName: z.string().min(1).max(200),
  toLat: z.number().gte(-90).lte(90),
  toLng: z.number().gte(-180).lte(180),
  toCountryCode: z
    .string()
    .length(2)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  mode: z.enum(TRANSPORT_MODES),
  company: z
    .string()
    .max(100)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  departureAt: z.coerce.date(),
  arrivalAt: z.coerce.date(),
  notesMd: z.string().max(20000).default(""),
  imageUrls: z.array(z.string()).default([]),
});

const createSchema = baseTransportSchema.extend({
  // Si el user marcó el toggle de quick-add de la city desconocida
  // debajo del campo from o to, viene la mini-config de creación.
  fromQuickAdd: cityCreateSchema.optional(),
  toQuickAdd: cityCreateSchema.optional(),
});

const updateSchema = baseTransportSchema.extend({
  id: z.string().min(1),
});

async function getActor(): Promise<{ actor: Actor; tripId: string } | null> {
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
    actor: {
      userId: session.user.id,
      role: session.user.role,
      isTripMember: !!member || session.user.role === "seed",
    },
    tripId: trip.id,
  };
}

/** Busca city del trip por proximidad (50km) al endpoint dado. */
async function autoLinkCity(
  tripId: string,
  point: { lat: number; lng: number }
): Promise<string | null> {
  const cities = await prisma.city.findMany({
    where: { tripId, archivedAt: null },
    select: { id: true, lat: true, lng: true },
  });
  return findClosestCity(point, cities)?.id ?? null;
}

/** Calcula `order` para una city quick-add según posición elegida. */
async function computeQuickAddOrder(
  tripId: string,
  cityCfg: { visibility: "shared" | "group"; position?: "before" | "after" }
): Promise<number> {
  const allOrders = await prisma.city.findMany({
    where: { tripId },
    select: { order: true, visibility: true },
  });
  const sharedOrders = allOrders.filter((c) => c.visibility === "shared").map((c) => c.order);
  const minAny = allOrders.length ? Math.min(...allOrders.map((c) => c.order)) : 0;
  const maxAny = allOrders.length ? Math.max(...allOrders.map((c) => c.order)) : -1;
  const maxShared = sharedOrders.length ? Math.max(...sharedOrders) : -1;

  if (cityCfg.visibility === "shared") {
    let order = maxShared >= 0 ? maxShared + 1 : (allOrders.length ? minAny - 1 : 0);
    while (allOrders.some((c) => c.order === order)) order++;
    return order;
  }
  // group
  if (cityCfg.position === "before") return minAny - 1;
  return maxAny + 1;
}

export async function createTransportAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActor();
  if (!ctx || !canCreate(ctx.actor)) {
    return { ok: false, error: "Sin permisos para crear transportes." };
  }

  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const input = parsed.data;
  if (input.arrivalAt < input.departureAt) {
    return { ok: false, error: "La llegada no puede ser antes de la salida." };
  }

  const transport = await prisma.$transaction(async (tx) => {
    // Quick-adds primero (si vinieron) para tener cityId al crear el transport.
    let fromCityId: string | null = null;
    let toCityId: string | null = null;

    if (input.fromQuickAdd) {
      const order = await computeQuickAddOrder(ctx.tripId, input.fromQuickAdd);
      const city = await tx.city.create({
        data: {
          tripId: ctx.tripId,
          name: input.fromName,
          lat: input.fromLat,
          lng: input.fromLng,
          countryCode: input.fromCountryCode,
          visibility: input.fromQuickAdd.visibility,
          order,
          createdById: ctx.actor.userId,
        },
      });
      if (input.fromQuickAdd.visibility === "group") {
        await tx.cityMember.create({
          data: { cityId: city.id, userId: ctx.actor.userId },
        });
      }
      fromCityId = city.id;
    }
    if (input.toQuickAdd) {
      const order = await computeQuickAddOrder(ctx.tripId, input.toQuickAdd);
      const city = await tx.city.create({
        data: {
          tripId: ctx.tripId,
          name: input.toName,
          lat: input.toLat,
          lng: input.toLng,
          countryCode: input.toCountryCode,
          visibility: input.toQuickAdd.visibility,
          order,
          createdById: ctx.actor.userId,
        },
      });
      if (input.toQuickAdd.visibility === "group") {
        await tx.cityMember.create({
          data: { cityId: city.id, userId: ctx.actor.userId },
        });
      }
      toCityId = city.id;
    }

    // Auto-link para los endpoints que NO se quick-added.
    if (fromCityId === null) {
      fromCityId = await autoLinkCityTx(tx, ctx.tripId, {
        lat: input.fromLat,
        lng: input.fromLng,
      });
    }
    if (toCityId === null) {
      toCityId = await autoLinkCityTx(tx, ctx.tripId, {
        lat: input.toLat,
        lng: input.toLng,
      });
    }

    return tx.transport.create({
      data: {
        tripId: ctx.tripId,
        fromName: input.fromName,
        fromLat: input.fromLat,
        fromLng: input.fromLng,
        toName: input.toName,
        toLat: input.toLat,
        toLng: input.toLng,
        fromCityId,
        toCityId,
        mode: input.mode,
        company: input.company,
        departureAt: input.departureAt,
        arrivalAt: input.arrivalAt,
        notesMd: input.notesMd,
        imageUrls: input.imageUrls,
        createdById: ctx.actor.userId,
      },
      select: { id: true },
    });
  });

  revalidatePath("/");
  return { ok: true, data: { id: transport.id } };
}

// Versión que acepta el client de la transacción.
async function autoLinkCityTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tripId: string,
  point: { lat: number; lng: number }
): Promise<string | null> {
  const cities = await tx.city.findMany({
    where: { tripId, archivedAt: null },
    select: { id: true, lat: true, lng: true },
  });
  return findClosestCity(point, cities)?.id ?? null;
}

export async function updateTransportAction(
  rawInput: unknown
): Promise<ActionResult> {
  const ctx = await getActor();
  if (!ctx) return { ok: false, error: "Sin sesión." };

  const parsed = updateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const input = parsed.data;
  if (input.arrivalAt < input.departureAt) {
    return { ok: false, error: "La llegada no puede ser antes de la salida." };
  }

  const existing = await prisma.transport.findUnique({
    where: { id: input.id },
    select: { createdById: true, archivedAt: true, tripId: true },
  });
  if (!existing) return { ok: false, error: "Transporte no encontrado." };
  if (!canEdit(ctx.actor, existing)) {
    return { ok: false, error: "Solo el autor o el seed pueden editar." };
  }

  // Re-correr auto-link en update por si el user cambió coords.
  const fromCityId = await autoLinkCity(existing.tripId, {
    lat: input.fromLat,
    lng: input.fromLng,
  });
  const toCityId = await autoLinkCity(existing.tripId, {
    lat: input.toLat,
    lng: input.toLng,
  });

  await prisma.transport.update({
    where: { id: input.id },
    data: {
      fromName: input.fromName,
      fromLat: input.fromLat,
      fromLng: input.fromLng,
      toName: input.toName,
      toLat: input.toLat,
      toLng: input.toLng,
      fromCityId,
      toCityId,
      mode: input.mode,
      company: input.company,
      departureAt: input.departureAt,
      arrivalAt: input.arrivalAt,
      notesMd: input.notesMd,
      imageUrls: input.imageUrls,
    },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function archiveTransportAction(
  transportId: string
): Promise<ActionResult> {
  const ctx = await getActor();
  if (!ctx) return { ok: false, error: "Sin sesión." };
  const t = await prisma.transport.findUnique({
    where: { id: transportId },
    select: { createdById: true, archivedAt: true },
  });
  if (!t) return { ok: false, error: "Transporte no encontrado." };
  if (!canArchive(ctx.actor, t)) {
    return { ok: false, error: "Sin permisos para archivar." };
  }
  await prisma.transport.update({
    where: { id: transportId },
    data: { archivedAt: new Date(), archivedById: ctx.actor.userId },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function unarchiveTransportAction(
  transportId: string
): Promise<ActionResult> {
  const ctx = await getActor();
  if (!ctx) return { ok: false, error: "Sin sesión." };
  const t = await prisma.transport.findUnique({
    where: { id: transportId },
    select: { createdById: true, archivedAt: true },
  });
  if (!t) return { ok: false, error: "Transporte no encontrado." };
  if (!canUnarchive(ctx.actor, t)) {
    return { ok: false, error: "Sin permisos para desarchivar." };
  }
  await prisma.transport.update({
    where: { id: transportId },
    data: { archivedAt: null, archivedById: null },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteTransportAction(
  transportId: string
): Promise<ActionResult> {
  const ctx = await getActor();
  if (!ctx || !canDelete(ctx.actor)) {
    return { ok: false, error: "Solo el seed puede eliminar." };
  }
  await prisma.transport.delete({ where: { id: transportId } });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

/** Re-correr auto-link sobre transports existentes cuando se agrega una city. */
export async function relinkTransportsForNewCity(
  tripId: string,
  city: { id: string; lat: number; lng: number }
): Promise<void> {
  // Busca transports cuyo from o to está cerca de la nueva city y NO tiene FK.
  const candidates = await prisma.transport.findMany({
    where: {
      tripId,
      OR: [{ fromCityId: null }, { toCityId: null }],
    },
    select: {
      id: true,
      fromCityId: true,
      toCityId: true,
      fromLat: true,
      fromLng: true,
      toLat: true,
      toLng: true,
    },
  });

  for (const t of candidates) {
    const updates: { fromCityId?: string; toCityId?: string } = {};
    if (t.fromCityId === null) {
      // ¿Es esta city la más cercana? Necesitamos comparar contra todas las cities.
      const closest = await autoLinkCity(tripId, {
        lat: t.fromLat,
        lng: t.fromLng,
      });
      if (closest === city.id) updates.fromCityId = city.id;
    }
    if (t.toCityId === null) {
      const closest = await autoLinkCity(tripId, {
        lat: t.toLat,
        lng: t.toLng,
      });
      if (closest === city.id) updates.toCityId = city.id;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.transport.update({ where: { id: t.id }, data: updates });
    }
  }
}
