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
import { resolveCoordsFromMapsUrl } from "@/lib/mapsUrl";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const createSchema = z.object({
  cityId: z.string().min(1),
  title: z.string().min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  mapsUrl: z
    .string()
    .url()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notesMd: z.string().max(20000).default(""),
  imageUrls: z.array(z.string()).default([]),
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

export async function createAccommodationAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  const actor = await getActor();
  if (!actor || !canCreate(actor)) {
    return { ok: false, error: "Sin permisos para crear alojamientos." };
  }

  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (end < start) {
    return { ok: false, error: "La fecha de fin no puede ser antes del inicio." };
  }

  const city = await prisma.city.findUnique({
    where: { id: parsed.data.cityId },
    select: { id: true },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };

  const coords = parsed.data.mapsUrl
    ? await resolveCoordsFromMapsUrl(parsed.data.mapsUrl)
    : null;

  const accommodation = await prisma.accommodation.create({
    data: {
      cityId: parsed.data.cityId,
      title: parsed.data.title,
      startDate: start,
      endDate: end,
      mapsUrl: parsed.data.mapsUrl,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      notesMd: parsed.data.notesMd,
      imageUrls: parsed.data.imageUrls,
      createdById: actor.userId,
    },
    select: { id: true },
  });
  revalidatePath("/");
  return { ok: true, data: { id: accommodation.id } };
}

export async function updateAccommodationAction(
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

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (end < start) {
    return { ok: false, error: "La fecha de fin no puede ser antes del inicio." };
  }

  const existing = await prisma.accommodation.findUnique({
    where: { id: parsed.data.id },
    select: { createdById: true, archivedAt: true, mapsUrl: true, lat: true, lng: true },
  });
  if (!existing) return { ok: false, error: "Alojamiento no encontrado." };
  if (!canEdit(actor, existing)) {
    return { ok: false, error: "Solo el autor o el seed pueden editar." };
  }

  let coordsUpdate: { lat: number | null; lng: number | null } | null = null;
  if (parsed.data.mapsUrl !== existing.mapsUrl) {
    const coords = parsed.data.mapsUrl
      ? await resolveCoordsFromMapsUrl(parsed.data.mapsUrl)
      : null;
    coordsUpdate = { lat: coords?.lat ?? null, lng: coords?.lng ?? null };
  }

  await prisma.accommodation.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      startDate: start,
      endDate: end,
      mapsUrl: parsed.data.mapsUrl,
      ...(coordsUpdate ?? {}),
      notesMd: parsed.data.notesMd,
      imageUrls: parsed.data.imageUrls,
    },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function archiveAccommodationAction(
  accommodationId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };
  const a = await prisma.accommodation.findUnique({
    where: { id: accommodationId },
    select: { createdById: true, archivedAt: true },
  });
  if (!a) return { ok: false, error: "Alojamiento no encontrado." };
  if (!canArchive(actor, a)) {
    return { ok: false, error: "Sin permisos para archivar." };
  }
  await prisma.accommodation.update({
    where: { id: accommodationId },
    data: { archivedAt: new Date(), archivedById: actor.userId },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function unarchiveAccommodationAction(
  accommodationId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };
  const a = await prisma.accommodation.findUnique({
    where: { id: accommodationId },
    select: { createdById: true, archivedAt: true },
  });
  if (!a) return { ok: false, error: "Alojamiento no encontrado." };
  if (!canUnarchive(actor, a)) {
    return { ok: false, error: "Sin permisos para desarchivar." };
  }
  await prisma.accommodation.update({
    where: { id: accommodationId },
    data: { archivedAt: null, archivedById: null },
  });
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteAccommodationAction(
  accommodationId: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || !canDelete(actor)) {
    return { ok: false, error: "Solo el seed puede eliminar." };
  }
  await prisma.accommodation.delete({ where: { id: accommodationId } });
  revalidatePath("/");
  return { ok: true, data: undefined };
}
