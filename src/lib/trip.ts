import { prisma } from "@/lib/prisma";
import type { CityModel } from "@/generated/prisma/models";

export type TripContext = {
  trip: { id: string; name: string };
  /** El user es TripMember (puede crear/editar). Sin esto solo ve shared en read-only. */
  isTripMember: boolean;
  isSeed: boolean;
};

export async function getTripContext(opts: {
  userId: string | null;
  userRole?: "seed" | "member";
}): Promise<TripContext | null> {
  const trip = await prisma.trip.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!trip) return null;

  const isSeed = opts.userRole === "seed";
  let isTripMember = false;
  if (opts.userId) {
    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: trip.id, userId: opts.userId } },
      select: { id: true },
    });
    isTripMember = !!member || isSeed;
  }

  return { trip, isTripMember, isSeed };
}

export type VisibleCity = Pick<
  CityModel,
  | "id"
  | "name"
  | "lat"
  | "lng"
  | "countryCode"
  | "visibility"
  | "order"
  | "archivedAt"
  | "createdById"
>;

export type TripMemberLite = {
  userId: string;
  name: string;
  email: string;
};

export async function getTripMembers(tripId: string): Promise<TripMemberLite[]> {
  const rows = await prisma.tripMember.findMany({
    where: { tripId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((r) => ({
    userId: r.user.id,
    name: r.user.name,
    email: r.user.email,
  }));
}

/**
 * Cities visibles para el user en el trip:
 * - Todas las `shared` (cualquier registrado las ve, sea o no TripMember)
 * - Las `group` donde el user es CityMember (o si es seed: todas)
 *
 * Excluye las archivadas — la UI las muestra en una sección "Archivado"
 * aparte y no es prioritaria en la primera pasada.
 */
export async function getVisibleCities(opts: {
  tripId: string;
  userId: string | null;
  isSeed: boolean;
}): Promise<VisibleCity[]> {
  const select = {
    id: true,
    name: true,
    lat: true,
    lng: true,
    countryCode: true,
    visibility: true,
    order: true,
    archivedAt: true,
    createdById: true,
  };

  if (opts.isSeed) {
    return prisma.city.findMany({
      where: { tripId: opts.tripId, archivedAt: null },
      orderBy: { order: "asc" },
      select,
    });
  }

  return prisma.city.findMany({
    where: {
      tripId: opts.tripId,
      archivedAt: null,
      OR: [
        { visibility: "shared" },
        opts.userId
          ? { visibility: "group", members: { some: { userId: opts.userId } } }
          : { id: "__never__" },
      ],
    },
    orderBy: { order: "asc" },
    select,
  });
}
