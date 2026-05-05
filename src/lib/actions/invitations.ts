"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/permissions";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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

const cityIdSchema = z.object({ cityId: z.string().min(1) });
const tokenSchema = z.object({ token: z.string().min(1) });

function buildInviteUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "";
  return `${base}/invite/${token}`;
}

export async function createCityInvitationAction(
  cityId: string
): Promise<ActionResult<{ token: string; url: string }>> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const parsed = cityIdSchema.safeParse({ cityId });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const city = await prisma.city.findUnique({
    where: { id: parsed.data.cityId },
    select: {
      id: true,
      tripId: true,
      visibility: true,
      archivedAt: true,
    },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };
  if (city.archivedAt) return { ok: false, error: "La ciudad está archivada." };
  if (city.visibility !== "group") {
    return { ok: false, error: "Solo se pueden invitar a ciudades grupo." };
  }

  if (actor.role !== "seed") {
    const membership = await prisma.cityMember.findUnique({
      where: { cityId_userId: { cityId: city.id, userId: actor.userId } },
      select: { id: true },
    });
    if (!membership) {
      return { ok: false, error: "Solo los miembros de la ciudad pueden invitar." };
    }
  }

  const invitation = await prisma.invitation.create({
    data: {
      tripId: city.tripId,
      cityId: city.id,
      invitedById: actor.userId,
    },
    select: { token: true },
  });

  return {
    ok: true,
    data: { token: invitation.token, url: buildInviteUrl(invitation.token) },
  };
}

export async function acceptInvitationAction(
  token: string
): Promise<ActionResult<{ redirect: string }>> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const parsed = tokenSchema.safeParse({ token });
  if (!parsed.success) return { ok: false, error: "Token inválido." };

  const invitation = await prisma.invitation.findUnique({
    where: { token: parsed.data.token },
    select: {
      id: true,
      tripId: true,
      cityId: true,
      acceptedAt: true,
      expiresAt: true,
    },
  });
  if (!invitation) {
    return { ok: false, error: "Invitación no encontrada o expirada." };
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return { ok: false, error: "Invitación expirada." };
  }
  if (!invitation.cityId) {
    return { ok: false, error: "Invitación inválida." };
  }

  const city = await prisma.city.findUnique({
    where: { id: invitation.cityId },
    select: { id: true, archivedAt: true },
  });
  if (!city || city.archivedAt) {
    return { ok: false, error: "La ciudad ya no está disponible." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.tripMember.createMany({
      data: [{ tripId: invitation.tripId, userId: actor.userId }],
      skipDuplicates: true,
    });
    await tx.cityMember.createMany({
      data: [{ cityId: invitation.cityId!, userId: actor.userId }],
      skipDuplicates: true,
    });
    await tx.invitationAcceptance.upsert({
      where: { invitationId_userId: { invitationId: invitation.id, userId: actor.userId } },
      create: { invitationId: invitation.id, userId: actor.userId },
      update: {},
    });
    if (!invitation.acceptedAt) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), acceptedById: actor.userId },
      });
    }
  });

  revalidatePath("/");
  return { ok: true, data: { redirect: "/" } };
}

export type CityInvitationListItem = {
  token: string;
  createdAt: Date;
  acceptedByName: string | null;
  acceptedAt: Date | null;
  acceptances: { name: string | null }[];
};

export async function listCityInvitationsAction(
  cityId: string
): Promise<ActionResult<{ invitations: CityInvitationListItem[] }>> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const parsed = cityIdSchema.safeParse({ cityId });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const city = await prisma.city.findUnique({
    where: { id: parsed.data.cityId },
    select: { id: true, visibility: true, archivedAt: true },
  });
  if (!city) return { ok: false, error: "Ciudad no encontrada." };
  if (city.visibility !== "group") {
    return { ok: false, error: "Solo aplica a ciudades grupo." };
  }

  if (actor.role !== "seed") {
    const membership = await prisma.cityMember.findUnique({
      where: { cityId_userId: { cityId: city.id, userId: actor.userId } },
      select: { id: true },
    });
    if (!membership) {
      return { ok: false, error: "Sin permisos." };
    }
  }

  const rows = await prisma.invitation.findMany({
    where: { cityId: city.id },
    orderBy: { createdAt: "desc" },
    select: {
      token: true,
      createdAt: true,
      acceptedAt: true,
      acceptedBy: { select: { name: true } },
      acceptances: { select: { user: { select: { name: true } } }, orderBy: { acceptedAt: "asc" } },
    },
  });

  return {
    ok: true,
    data: {
      invitations: rows.map((r) => ({
        token: r.token,
        createdAt: r.createdAt,
        acceptedAt: r.acceptedAt,
        acceptedByName: r.acceptedBy?.name ?? null,
        acceptances: r.acceptances.map((a) => ({ name: a.user.name })),
      })),
    },
  };
}

export async function revokeInvitationAction(
  token: string
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Sin sesión." };

  const parsed = tokenSchema.safeParse({ token });
  if (!parsed.success) return { ok: false, error: "Token inválido." };

  const invitation = await prisma.invitation.findUnique({
    where: { token: parsed.data.token },
    select: { id: true, invitedById: true, cityId: true },
  });
  if (!invitation) return { ok: false, error: "Invitación no encontrada." };

  if (actor.role !== "seed" && invitation.invitedById !== actor.userId) {
    return { ok: false, error: "Solo el creador del link o el seed pueden revocarlo." };
  }

  await prisma.invitation.delete({ where: { id: invitation.id } });
  revalidatePath("/");
  return { ok: true, data: undefined };
}
