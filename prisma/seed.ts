import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// =====================================================================
//  Itinerario fijo (Euro trip 2026: 31 mayo → 20 junio)
// =====================================================================

type CitySeed = {
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
};

const CITIES: CitySeed[] = [
  // dom 31 may → mié 03 jun
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041, countryCode: "NL" },
  // mié 03 jun → vie 05 jun
  { name: "Berlin", lat: 52.52, lng: 13.405, countryCode: "DE" },
  // vie 05 jun → dom 07 jun
  { name: "Praga", lat: 50.0755, lng: 14.4378, countryCode: "CZ" },
  // dom 07 jun → mar 09 jun
  { name: "Budapest", lat: 47.4979, lng: 19.0402, countryCode: "HU" },
  // mar 09 jun → jue 11 jun
  { name: "Vienna", lat: 48.2082, lng: 16.3738, countryCode: "AT" },
  // jue 11 jun → sáb 13 jun
  { name: "Santorini", lat: 36.4172, lng: 25.4325, countryCode: "GR" },
  // sáb 13 jun → mié 17 jun
  { name: "Naxos", lat: 37.1066, lng: 25.3789, countryCode: "GR" },
  // mié 17 jun → vie 19 jun
  { name: "Atenas", lat: 37.9838, lng: 23.7275, countryCode: "GR" },
  // vie 19 jun → sáb 20 jun
  { name: "Madrid", lat: 40.4168, lng: -3.7038, countryCode: "ES" },
];

type TransportSeed = {
  fromName: string;
  toName: string;
  mode: "plane" | "bus" | "train" | "car" | "ferry" | "other";
  departureAt: string; // ISO local-ish
  arrivalAt: string;
  company?: string;
};

// Solo el explícito que dio el usuario (mié 03 jun: Amsterdam → Berlin).
// El resto de las transiciones se cargan después desde la UI.
const TRANSPORTS: TransportSeed[] = [
  {
    fromName: "Amsterdam",
    toName: "Berlin",
    mode: "train",
    departureAt: "2026-06-03T09:00:00",
    arrivalAt: "2026-06-03T15:30:00",
    company: "ICE",
  },
];

// =====================================================================
//  Main
// =====================================================================

async function main() {
  const seedEmail = process.env.SEED_USER_EMAIL;
  const seedPassword = process.env.SEED_USER_PASSWORD;
  const tripName = process.env.SEED_TRIP_NAME ?? "Euro trip";

  if (!seedEmail || !seedPassword) {
    throw new Error(
      "SEED_USER_EMAIL y SEED_USER_PASSWORD son requeridos en .env para correr el seed.",
    );
  }

  // 1. Seed user (idempotente)
  const passwordHash = await hash(seedPassword, 12);
  const seedUser = await prisma.user.upsert({
    where: { email: seedEmail },
    update: { name: "Germán Katzenelson", role: "seed" },
    create: {
      email: seedEmail,
      name: "Germán Katzenelson",
      passwordHash,
      role: "seed",
    },
  });
  console.log(`✓ Seed user: ${seedUser.email}`);

  // 2. Trip (single-tenant)
  let trip = await prisma.trip.findFirst({ orderBy: { createdAt: "asc" } });
  if (!trip) {
    trip = await prisma.trip.create({ data: { name: tripName } });
    console.log(`✓ Trip creado: ${trip.name}`);
  } else {
    console.log(`✓ Trip existente: ${trip.name}`);
  }

  // 3. TripMember para el seed
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: seedUser.id } },
    update: {},
    create: { tripId: trip.id, userId: seedUser.id },
  });

  // 4. Wipe del itinerario actual del trip (preserva user + trip + membership).
  //    Orden: actividades → invitaciones → cityMembers → transports → cities.
  const wipe = await prisma.$transaction([
    prisma.activity.deleteMany({ where: { city: { tripId: trip.id } } }),
    prisma.invitation.deleteMany({ where: { tripId: trip.id } }),
    prisma.cityMember.deleteMany({ where: { city: { tripId: trip.id } } }),
    prisma.transport.deleteMany({ where: { tripId: trip.id } }),
    prisma.city.deleteMany({ where: { tripId: trip.id } }),
  ]);
  console.log(
    `✓ Wipe: ${wipe[0].count} activities, ${wipe[1].count} invitations, ${wipe[2].count} cityMembers, ${wipe[3].count} transports, ${wipe[4].count} cities`,
  );

  // 5. Insertar cities (orden 0..N-1, todas shared)
  const cityIdByName = new Map<string, string>();
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    const created = await prisma.city.create({
      data: {
        tripId: trip.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        countryCode: c.countryCode,
        visibility: "shared",
        order: i,
        createdById: seedUser.id,
      },
    });
    cityIdByName.set(c.name, created.id);
  }
  console.log(`✓ Cities: ${CITIES.length} creadas`);

  // 6. Insertar transports (linkeados a las cities por nombre)
  for (const t of TRANSPORTS) {
    const fromCity = CITIES.find((c) => c.name === t.fromName);
    const toCity = CITIES.find((c) => c.name === t.toName);
    if (!fromCity || !toCity) {
      console.error(`✗ Transport ${t.fromName} → ${t.toName}: city no encontrada`);
      continue;
    }
    await prisma.transport.create({
      data: {
        tripId: trip.id,
        fromName: fromCity.name,
        fromLat: fromCity.lat,
        fromLng: fromCity.lng,
        toName: toCity.name,
        toLat: toCity.lat,
        toLng: toCity.lng,
        fromCityId: cityIdByName.get(fromCity.name) ?? null,
        toCityId: cityIdByName.get(toCity.name) ?? null,
        mode: t.mode,
        company: t.company,
        departureAt: new Date(t.departureAt),
        arrivalAt: new Date(t.arrivalAt),
        createdById: seedUser.id,
      },
    });
  }
  console.log(`✓ Transports: ${TRANSPORTS.length} creados`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
