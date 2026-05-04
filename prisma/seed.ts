import "dotenv/config";
import { hash } from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { z } from "zod";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const cityEntrySchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  countryCode: z.string().length(2).optional(),
});

async function main() {
  const seedEmail = process.env.SEED_USER_EMAIL;
  const seedPassword = process.env.SEED_USER_PASSWORD;
  const tripName = process.env.SEED_TRIP_NAME ?? "Mi viaje";

  if (!seedEmail || !seedPassword) {
    throw new Error(
      "SEED_USER_EMAIL y SEED_USER_PASSWORD son requeridos en .env para correr el seed."
    );
  }

  // 1. Seed user (idempotente: upsert por email)
  const passwordHash = await hash(seedPassword, 12);
  const seedUser = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {},
    create: {
      email: seedEmail,
      name: "Seed",
      passwordHash,
      role: "seed",
    },
  });
  console.log(`✓ Seed user: ${seedUser.email} (${seedUser.id})`);

  // 2. Trip único (single-tenant). Si ya existe, lo reutiliza.
  let trip = await prisma.trip.findFirst({ orderBy: { createdAt: "asc" } });
  if (!trip) {
    trip = await prisma.trip.create({ data: { name: tripName } });
    console.log(`✓ Trip creado: ${trip.name} (${trip.id})`);
  } else {
    console.log(`✓ Trip existente: ${trip.name} (${trip.id})`);
  }

  // 3. TripMember para el seed user
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: seedUser.id } },
    update: {},
    create: { tripId: trip.id, userId: seedUser.id },
  });

  // 4. Cities desde cities.seed.json (opcional)
  const seedFile = join(process.cwd(), "prisma", "cities.seed.json");
  if (!existsSync(seedFile)) {
    console.log("ℹ cities.seed.json no existe, salteando carga de ciudades.");
    return;
  }

  const raw = JSON.parse(readFileSync(seedFile, "utf-8"));
  if (!Array.isArray(raw)) {
    console.error("✗ cities.seed.json debe ser un array. Salteando.");
    return;
  }

  // Cuántas cities shared ya hay para no duplicar el order.
  const existingCount = await prisma.city.count({
    where: { tripId: trip.id, visibility: "shared" },
  });

  let created = 0;
  let skipped = 0;
  let order = existingCount;

  for (const [i, entry] of raw.entries()) {
    const parsed = cityEntrySchema.safeParse(entry);
    if (!parsed.success) {
      console.error(
        `✗ Entry #${i} inválida (${parsed.error.issues[0]?.message ?? "schema error"}), salteando.`
      );
      continue;
    }

    // Idempotencia: matchea por (tripId, name).
    const exists = await prisma.city.findFirst({
      where: { tripId: trip.id, name: parsed.data.name },
    });
    if (exists) {
      skipped++;
      continue;
    }

    try {
      await prisma.city.create({
        data: {
          tripId: trip.id,
          name: parsed.data.name,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          countryCode: parsed.data.countryCode,
          visibility: "shared",
          order: order++,
          createdById: seedUser.id,
        },
      });
      created++;
    } catch (err) {
      console.error(`✗ Error creando ciudad "${parsed.data.name}":`, err);
    }
  }

  console.log(`✓ Cities: ${created} creadas, ${skipped} ya existían.`);
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
