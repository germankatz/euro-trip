import { prisma } from "@/lib/prisma";
import type {
  CityModel,
  TransportModel,
  ActivityModel,
  AccommodationModel,
} from "@/generated/prisma/models";

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

// =====================================================================
//  TRANSPORTS & ACTIVITIES
// =====================================================================

export type VisibleTransport = Pick<
  TransportModel,
  | "id"
  | "fromName"
  | "fromLat"
  | "fromLng"
  | "toName"
  | "toLat"
  | "toLng"
  | "fromCityId"
  | "toCityId"
  | "mode"
  | "company"
  | "departureAt"
  | "arrivalAt"
  | "notesMd"
  | "imageUrls"
  | "createdById"
  | "createdAt"
  | "archivedAt"
>;

export type ActivityReactionLite = {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
};

export type VisibleActivity = Pick<
  ActivityModel,
  | "id"
  | "cityId"
  | "title"
  | "mapsUrl"
  | "lat"
  | "lng"
  | "notesMd"
  | "imageUrls"
  | "createdById"
  | "createdAt"
  | "archivedAt"
> & {
  reactions: ActivityReactionLite[];
};

export type VisibleAccommodation = Pick<
  AccommodationModel,
  | "id"
  | "cityId"
  | "title"
  | "startDate"
  | "endDate"
  | "mapsUrl"
  | "lat"
  | "lng"
  | "notesMd"
  | "imageUrls"
  | "createdById"
  | "createdAt"
  | "archivedAt"
>;

const transportSelect = {
  id: true,
  fromName: true,
  fromLat: true,
  fromLng: true,
  toName: true,
  toLat: true,
  toLng: true,
  fromCityId: true,
  toCityId: true,
  mode: true,
  company: true,
  departureAt: true,
  arrivalAt: true,
  notesMd: true,
  imageUrls: true,
  createdById: true,
  createdAt: true,
  archivedAt: true,
} as const;

const activitySelect = {
  id: true,
  cityId: true,
  title: true,
  mapsUrl: true,
  lat: true,
  lng: true,
  notesMd: true,
  imageUrls: true,
  createdById: true,
  createdAt: true,
  archivedAt: true,
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
      user: { select: { name: true } },
    },
  },
} as const;

const accommodationSelect = {
  id: true,
  cityId: true,
  title: true,
  startDate: true,
  endDate: true,
  mapsUrl: true,
  lat: true,
  lng: true,
  notesMd: true,
  imageUrls: true,
  createdById: true,
  createdAt: true,
  archivedAt: true,
} as const;

/**
 * Transports visibles para el user. Heredan visibility de las cities que
 * conectan: si toca una city `group`, solo la ven los CityMembers.
 *
 * Implementación: filtramos por OR de los siguientes:
 *   1. fromCityId y toCityId son null (transporte "free", visible a todos)
 *   2. ambas cities son shared o están en visibleCityIds
 *   3. una de las cities es null y la otra es visible
 * Lo más simple: pedirle a Prisma que solo traiga transports cuyas FKs
 * (las no-null) estén en el set de cities visibles.
 */
export async function getVisibleTransports(opts: {
  tripId: string;
  visibleCityIds: string[];
  isSeed: boolean;
  includeArchived?: boolean;
}): Promise<VisibleTransport[]> {
  const { visibleCityIds, isSeed, includeArchived } = opts;
  const baseWhere = includeArchived
    ? { tripId: opts.tripId }
    : { tripId: opts.tripId, archivedAt: null };

  if (isSeed) {
    return prisma.transport.findMany({
      where: baseWhere,
      orderBy: { departureAt: "asc" },
      select: transportSelect,
    });
  }

  // Para non-seed: cada FK debe ser null o estar en visibleCityIds.
  // Equivale a: NOT EXISTS un FK que apunte a una city NO visible.
  return prisma.transport.findMany({
    where: {
      ...baseWhere,
      AND: [
        {
          OR: [
            { fromCityId: null },
            { fromCityId: { in: visibleCityIds } },
          ],
        },
        {
          OR: [
            { toCityId: null },
            { toCityId: { in: visibleCityIds } },
          ],
        },
      ],
    },
    orderBy: { departureAt: "asc" },
    select: transportSelect,
  });
}

/**
 * Activities visibles para el user: las que pertenecen a una city visible.
 * (Fácil porque cada activity tiene exactamente una city.)
 *
 * Backfill lazy: si una activity tiene `mapsUrl` pero `lat`/`lng` nulos,
 * resolvemos las coords en este request y las persistimos. Es one-shot —
 * en el siguiente render ya están guardadas. El timeout corto evita que
 * un URL roto bloquee el SSR.
 */
type RawActivityRow = Omit<VisibleActivity, "reactions"> & {
  reactions: { id: string; emoji: string; userId: string; user: { name: string } }[];
};

function normalizeActivity(r: RawActivityRow): VisibleActivity {
  return {
    ...r,
    reactions: (r.reactions ?? []).flatMap(({ id, emoji, userId, user }) =>
      user ? [{ id, emoji, userId, userName: user.name }] : [],
    ),
  };
}

export async function getVisibleActivities(opts: {
  visibleCityIds: string[];
  includeArchived?: boolean;
}): Promise<VisibleActivity[]> {
  const rows = (await prisma.activity.findMany({
    where: {
      cityId: { in: opts.visibleCityIds },
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: "asc" },
    select: activitySelect,
  })) as RawActivityRow[];

  const pendingBackfill = rows.filter(
    (r) => r.mapsUrl && (r.lat == null || r.lng == null),
  );
  if (pendingBackfill.length === 0) return rows.map(normalizeActivity);

  const { resolveCoordsFromMapsUrl } = await import("@/lib/mapsUrl");
  const resolved = await Promise.allSettled(
    pendingBackfill.map(async (r) => ({
      id: r.id,
      coords: await resolveCoordsFromMapsUrl(r.mapsUrl, { timeoutMs: 3000 }),
    })),
  );

  const updates = resolved
    .filter(
      (r): r is PromiseFulfilledResult<{ id: string; coords: { lat: number; lng: number } | null }> =>
        r.status === "fulfilled" && !!r.value.coords,
    )
    .map((r) => r.value);

  if (updates.length > 0) {
    await Promise.allSettled(
      updates.map((u) =>
        prisma.activity.update({
          where: { id: u.id },
          data: { lat: u.coords!.lat, lng: u.coords!.lng },
        }),
      ),
    );
    // Mergear coords en las rows que devolvemos sin volver a pegarle a la DB.
    const byId = new Map(updates.map((u) => [u.id, u.coords!]));
    return rows.map((r) => {
      const c = byId.get(r.id);
      return normalizeActivity(c ? { ...r, lat: c.lat, lng: c.lng } : r);
    });
  }

  return rows.map(normalizeActivity);
}

/**
 * Accommodations visibles. Mismo patrón que activities: pertenecen a una city
 * visible y backfill lazy de coords desde mapsUrl.
 */
export async function getVisibleAccommodations(opts: {
  visibleCityIds: string[];
  includeArchived?: boolean;
}): Promise<VisibleAccommodation[]> {
  const rows = await prisma.accommodation.findMany({
    where: {
      cityId: { in: opts.visibleCityIds },
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { startDate: "asc" },
    select: accommodationSelect,
  });

  const pendingBackfill = rows.filter(
    (r) => r.mapsUrl && (r.lat == null || r.lng == null),
  );
  if (pendingBackfill.length === 0) return rows;

  const { resolveCoordsFromMapsUrl } = await import("@/lib/mapsUrl");
  const resolved = await Promise.allSettled(
    pendingBackfill.map(async (r) => ({
      id: r.id,
      coords: await resolveCoordsFromMapsUrl(r.mapsUrl, { timeoutMs: 3000 }),
    })),
  );

  const updates = resolved
    .filter(
      (r): r is PromiseFulfilledResult<{ id: string; coords: { lat: number; lng: number } | null }> =>
        r.status === "fulfilled" && !!r.value.coords,
    )
    .map((r) => r.value);

  if (updates.length > 0) {
    await Promise.allSettled(
      updates.map((u) =>
        prisma.accommodation.update({
          where: { id: u.id },
          data: { lat: u.coords!.lat, lng: u.coords!.lng },
        }),
      ),
    );
    const byId = new Map(updates.map((u) => [u.id, u.coords!]));
    return rows.map((r) => {
      const c = byId.get(r.id);
      return c ? { ...r, lat: c.lat, lng: c.lng } : r;
    });
  }

  return rows;
}
