import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// =====================================================================
//  Itinerario fijo (Euro trip 2026: 31 mayo → 19 junio)
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
  // vie 19 jun
  { name: "Madrid", lat: 40.4168, lng: -3.7038, countryCode: "ES" },
];

// =====================================================================
//  Transports  (tiempos en hora local ciudad de salida)
// =====================================================================

type TransportSeed = {
  fromName: string;
  fromLat: number;
  fromLng: number;
  fromCityName: string;
  toName: string;
  toLat: number;
  toLng: number;
  toCityName: string;
  mode: "plane" | "bus" | "train" | "car" | "ferry" | "other";
  departureAt: string; // ISO sin Z — hora local ciudad origen
  arrivalAt: string;
  company?: string;
  notesMd?: string;
};

const TRANSPORTS: TransportSeed[] = [
  {
    fromName: "Amsterdam Centraal",
    fromLat: 52.3791,
    fromLng: 4.9003,
    fromCityName: "Amsterdam",
    toName: "Berlin Hauptbahnhof",
    toLat: 52.5251,
    toLng: 13.3694,
    toCityName: "Berlin",
    mode: "train",
    departureAt: "2026-06-03T06:00:00",
    arrivalAt: "2026-06-03T11:41:00",
    company: "ICE",
    notesMd: "10 min caminando del hostel a la estación en Amsterdam.",
  },
  {
    fromName: "Berlin Hauptbahnhof",
    fromLat: 52.5251,
    fromLng: 13.3694,
    fromCityName: "Berlin",
    toName: "Praha hlavní nádraží",
    toLat: 50.0826,
    toLng: 14.4348,
    toCityName: "Praga",
    mode: "train",
    departureAt: "2026-06-05T07:28:00",
    arrivalAt: "2026-06-05T11:25:00",
    notesMd: "15 min en tren de la estación al hostel en Berlin.",
  },
  {
    fromName: "Praha hlavní nádraží",
    fromLat: 50.0826,
    fromLng: 14.4348,
    fromCityName: "Praga",
    toName: "Budapest-Kelenföld",
    toLat: 47.466,
    toLng: 18.9797,
    toCityName: "Budapest",
    mode: "train",
    departureAt: "2026-06-07T06:01:00",
    arrivalAt: "2026-06-07T12:58:00",
    notesMd: "15 min caminando del hostel a la estación en Praga.",
  },
  {
    fromName: "Budapest-Keleti",
    fromLat: 47.5002,
    fromLng: 19.0836,
    fromCityName: "Budapest",
    toName: "Wien Hauptbahnhof",
    toLat: 48.1842,
    toLng: 16.3766,
    toCityName: "Vienna",
    mode: "train",
    departureAt: "2026-06-09T09:40:00",
    arrivalAt: "2026-06-09T12:20:00",
    notesMd: "15 min en tren del hostel a la estación en Budapest.",
  },
  {
    fromName: "Aeropuerto Internacional de Viena (VIE)",
    fromLat: 48.1102,
    fromLng: 16.5697,
    fromCityName: "Vienna",
    toName: "Aeropuerto de Santorini (JTR)",
    toLat: 36.3992,
    toLng: 25.4793,
    toCityName: "Santorini",
    mode: "plane",
    departureAt: "2026-06-11T19:00:00",
    arrivalAt: "2026-06-11T22:20:00",
    notesMd: "30 min en colectivo del hostel al aeropuerto en Vienna.",
  },
  {
    fromName: "Puerto de Santorini (Athinios)",
    fromLat: 36.35,
    fromLng: 25.4069,
    fromCityName: "Santorini",
    toName: "Puerto de Naxos",
    toLat: 37.1076,
    toLng: 25.3747,
    toCityName: "Naxos",
    mode: "ferry",
    departureAt: "2026-06-13T10:00:00",
    arrivalAt: "2026-06-13T12:00:00",
    notesMd: "Horario a confirmar — revisar Ferryscanner o directferries.",
  },
  {
    fromName: "Puerto de Naxos",
    fromLat: 37.1076,
    fromLng: 25.3747,
    fromCityName: "Naxos",
    toName: "El Pireo (Atenas)",
    toLat: 37.9425,
    toLng: 23.6463,
    toCityName: "Atenas",
    mode: "ferry",
    departureAt: "2026-06-17T10:00:00",
    arrivalAt: "2026-06-17T16:00:00",
    notesMd: "Horario a confirmar — revisar Ferryscanner o directferries.",
  },
  {
    fromName: "Aeropuerto de Atenas Eleftherios Venizelos (ATH)",
    fromLat: 37.9364,
    fromLng: 23.9445,
    fromCityName: "Atenas",
    toName: "Aeropuerto Adolfo Suárez Madrid-Barajas (MAD)",
    toLat: 40.4719,
    toLng: -3.5626,
    toCityName: "Madrid",
    mode: "plane",
    departureAt: "2026-06-19T10:00:00",
    arrivalAt: "2026-06-19T13:45:00",
  },
];

// =====================================================================
//  Accommodations
// =====================================================================

type AccommodationSeed = {
  cityName: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  mapsUrl?: string;
  notesMd?: string;
};

const ACCOMMODATIONS: AccommodationSeed[] = [
  {
    cityName: "Amsterdam",
    title: "St Christopher's Inn Amsterdam - The Winston",
    startDate: "2026-05-31",
    endDate: "2026-06-03",
    mapsUrl: "https://maps.app.goo.gl/c1UKXr6bTAFjg4GE7",
    notesMd: "40 min en tren del aeropuerto al hostel.",
  },
  {
    cityName: "Berlin",
    title: "The Circus Hostel",
    startDate: "2026-06-03",
    endDate: "2026-06-05",
    mapsUrl: "https://maps.app.goo.gl/KNkJQnYsGAscLun46",
    notesMd: "15 min en tren de la estación al hostel en Berlin.",
  },
  {
    cityName: "Praga",
    title: "Hostel Orange",
    startDate: "2026-06-05",
    endDate: "2026-06-07",
    mapsUrl: "https://maps.app.goo.gl/p7vAouduSiE7XMne7",
    notesMd: "15 min caminando de la estación al hostel en Praga.",
  },
  {
    cityName: "Budapest",
    title: "Wombat's City Hostel Budapest",
    startDate: "2026-06-07",
    endDate: "2026-06-09",
    mapsUrl: "https://maps.app.goo.gl/3sF3pNKaoLursuCN6",
    notesMd: "30 min en tren de la estación en Budapest al hostel.",
  },
  {
    cityName: "Vienna",
    title: "Wombat's City Hostel Vienna Naschmarkt",
    startDate: "2026-06-09",
    endDate: "2026-06-11",
    mapsUrl: "https://maps.app.goo.gl/FyAAAtXmpx72QeX3A",
    notesMd: "20 min en tren de la estación al hostel en Vienna.",
  },
  {
    cityName: "Santorini",
    title: "Hotel Thirasia",
    startDate: "2026-06-11",
    endDate: "2026-06-13",
    mapsUrl: "https://maps.app.goo.gl/YXZi2xfhrebmSh8Z9",
  },
  // Naxos — dos opciones de alojamiento para el grupo
  {
    cityName: "Naxos",
    title: "Azur Mare Naxos",
    startDate: "2026-06-13",
    endDate: "2026-06-17",
    mapsUrl: "https://maps.app.goo.gl/3qjQj9uinnatjHtW6",
  },
  {
    cityName: "Naxos",
    title: "Soula Hotel Naxos",
    startDate: "2026-06-13",
    endDate: "2026-06-17",
    mapsUrl: "https://maps.app.goo.gl/u1LjujF1yD4kUUSa8",
  },
];

// =====================================================================
//  Activities
//  notesMd vacío = sin reserva requerida
// =====================================================================

type ActivitySeed = {
  cityName: string;
  title: string;
  notesMd?: string;
};

const ACTIVITIES: ActivitySeed[] = [
  // ── Amsterdam ────────────────────────────────────────────────────────
  {
    cityName: "Amsterdam",
    title: "Casa de Ana Frank",
    notesMd: "Requiere reserva previa.",
  },
  {
    cityName: "Amsterdam",
    title: "Museo Van Gogh",
    notesMd: "Requiere reserva previa.",
  },
  {
    cityName: "Amsterdam",
    title: "Rijksmuseum",
    notesMd: "Se recomienda reservar con anticipación.",
  },
  {
    cityName: "Amsterdam",
    title: "Heineken Experience",
    notesMd: "Requiere reserva previa.",
  },
  { cityName: "Amsterdam", title: "Crucero por los canales" },

  // ── Berlin ───────────────────────────────────────────────────────────
  {
    cityName: "Berlin",
    title: "Cúpula del Reichstag",
    notesMd:
      "Requiere reserva previa (entrada gratuita). [Reservar aquí](https://visite.bundestag.de/BAPWeb/pages/createBookingRequest/viewBasicInformation.jsf?lang=en)",
  },
  { cityName: "Berlin", title: "Puerta de Brandeburgo" },
  { cityName: "Berlin", title: "East Side Gallery (Muro de Berlín)" },
  { cityName: "Berlin", title: "Monumento a los Judíos" },
  { cityName: "Berlin", title: "Berliner Dom" },
  { cityName: "Berlin", title: "Memorial del Holocausto" },

  // ── Praga ────────────────────────────────────────────────────────────
  {
    cityName: "Praga",
    title: "Castillo y catedral de Praga",
    notesMd: "Se recomienda reservar con anticipación.",
  },
  { cityName: "Praga", title: "Puente Carlos" },
  { cityName: "Praga", title: "Reloj Astronómico" },
  {
    cityName: "Praga",
    title: "Biblioteca Klementinum",
    notesMd: "Requiere reserva previa.",
  },

  // ── Budapest ─────────────────────────────────────────────────────────
  {
    cityName: "Budapest",
    title: "Parlamento de Hungría (tour interior)",
    notesMd: "Requiere reserva previa.",
  },
  { cityName: "Budapest", title: "Basílica San Esteban" },
  {
    cityName: "Budapest",
    title: "Termas Széchényi",
    notesMd: "Requiere reserva previa.",
  },
  { cityName: "Budapest", title: "Mercado Central" },
  { cityName: "Budapest", title: "Bastión de los Pescadores" },
  { cityName: "Budapest", title: "Castillo de Buda" },

  // ── Vienna ───────────────────────────────────────────────────────────
  {
    cityName: "Vienna",
    title: "Palacio Schönbrunn",
    notesMd: "Requiere reserva previa.",
  },
  {
    cityName: "Vienna",
    title: "Palacio Belvedere",
    notesMd: "Se recomienda reservar con anticipación.",
  },
  { cityName: "Vienna", title: "Catedral de San Esteban" },
  {
    cityName: "Vienna",
    title: "Ópera de Viena (tour o show)",
    notesMd: "Requiere reserva previa.",
  },

  // ── Santorini ────────────────────────────────────────────────────────
  {
    cityName: "Santorini",
    title: "Catamarán sunset cruise",
    notesMd: "Requiere reserva previa.",
  },
  { cityName: "Santorini", title: "Oia sunset" },
  { cityName: "Santorini", title: "Caminata Fira–Oia" },

  // ── Naxos ────────────────────────────────────────────────────────────
  { cityName: "Naxos", title: "Portara (Templo de Apolo)" },
  { cityName: "Naxos", title: "Playas (Plaka / Agios Prokopios)" },
  { cityName: "Naxos", title: "Recorrer la isla en ATV" },

  // ── Atenas ───────────────────────────────────────────────────────────
  {
    cityName: "Atenas",
    title: "Acrópolis",
    notesMd: "Requiere reserva previa.",
  },
  {
    cityName: "Atenas",
    title: "Museo de la Acrópolis",
    notesMd: "Se recomienda reservar con anticipación.",
  },
  { cityName: "Atenas", title: "Barrio Plaka" },
  { cityName: "Atenas", title: "Monte Licabeto" },
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

  // 3. TripMember para el seed user
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: seedUser.id } },
    update: {},
    create: { tripId: trip.id, userId: seedUser.id },
  });

  // 4. Wipe del itinerario (preserva user + trip + membership).
  //    Orden: activities → accommodations → invitations → cityMembers → transports → cities
  const wipe = await prisma.$transaction([
    prisma.activity.deleteMany({ where: { city: { tripId: trip.id } } }),
    prisma.accommodation.deleteMany({ where: { city: { tripId: trip.id } } }),
    prisma.invitation.deleteMany({ where: { tripId: trip.id } }),
    prisma.cityMember.deleteMany({ where: { city: { tripId: trip.id } } }),
    prisma.transport.deleteMany({ where: { tripId: trip.id } }),
    prisma.city.deleteMany({ where: { tripId: trip.id } }),
  ]);
  console.log(
    `✓ Wipe: ${wipe[0].count} activities, ${wipe[1].count} accommodations, ${wipe[2].count} invitations, ${wipe[3].count} cityMembers, ${wipe[4].count} transports, ${wipe[5].count} cities`,
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

  // 6. Insertar transports
  for (const t of TRANSPORTS) {
    const fromCityId = cityIdByName.get(t.fromCityName) ?? null;
    const toCityId = cityIdByName.get(t.toCityName) ?? null;
    if (!fromCityId || !toCityId) {
      console.error(`✗ Transport ${t.fromCityName} → ${t.toCityName}: city no encontrada`);
      continue;
    }
    await prisma.transport.create({
      data: {
        tripId: trip.id,
        fromName: t.fromName,
        fromLat: t.fromLat,
        fromLng: t.fromLng,
        toName: t.toName,
        toLat: t.toLat,
        toLng: t.toLng,
        fromCityId,
        toCityId,
        mode: t.mode,
        company: t.company ?? null,
        departureAt: new Date(t.departureAt),
        arrivalAt: new Date(t.arrivalAt),
        notesMd: t.notesMd ?? "",
        createdById: seedUser.id,
      },
    });
  }
  console.log(`✓ Transports: ${TRANSPORTS.length} creados`);

  // 7. Insertar accommodations
  for (const a of ACCOMMODATIONS) {
    const cityId = cityIdByName.get(a.cityName);
    if (!cityId) {
      console.error(`✗ Accommodation "${a.title}": city "${a.cityName}" no encontrada`);
      continue;
    }
    await prisma.accommodation.create({
      data: {
        cityId,
        title: a.title,
        startDate: new Date(a.startDate),
        endDate: new Date(a.endDate),
        mapsUrl: a.mapsUrl ?? null,
        notesMd: a.notesMd ?? "",
        createdById: seedUser.id,
      },
    });
  }
  console.log(`✓ Accommodations: ${ACCOMMODATIONS.length} creadas`);

  // 8. Insertar activities
  for (const act of ACTIVITIES) {
    const cityId = cityIdByName.get(act.cityName);
    if (!cityId) {
      console.error(`✗ Activity "${act.title}": city "${act.cityName}" no encontrada`);
      continue;
    }
    await prisma.activity.create({
      data: {
        cityId,
        title: act.title,
        notesMd: act.notesMd ?? "",
        createdById: seedUser.id,
      },
    });
  }
  console.log(`✓ Activities: ${ACTIVITIES.length} creadas`);
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
