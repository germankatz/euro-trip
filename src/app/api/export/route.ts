import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getTripContext,
  getVisibleCities,
  getVisibleActivities,
  getVisibleAccommodations,
  getVisibleTransports,
} from "@/lib/trip";

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const transportEmoji: Record<string, string> = {
  plane: "✈️",
  train: "🚂",
  bus: "🚌",
  car: "🚗",
  ferry: "⛴️",
  other: "🚦",
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function indentNotes(md: string): string {
  if (!md.trim()) return "";
  return (
    "\n" +
    md
      .trim()
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n") +
    "\n"
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await getTripContext({
    userId: session.user.id,
    userRole: session.user.role as "seed" | "member" | undefined,
  });
  if (!ctx) {
    return NextResponse.json({ error: "No trip found" }, { status: 404 });
  }

  const cities = await getVisibleCities({
    tripId: ctx.trip.id,
    userId: session.user.id,
    isSeed: ctx.isSeed,
  });

  const cityIds = cities.map((c) => c.id);

  const [activities, accommodations, transports] = await Promise.all([
    getVisibleActivities({ visibleCityIds: cityIds }),
    getVisibleAccommodations({ visibleCityIds: cityIds }),
    getVisibleTransports({
      tripId: ctx.trip.id,
      visibleCityIds: cityIds,
      isSeed: ctx.isSeed,
    }),
  ]);

  const actsByCity = new Map<string, typeof activities>();
  for (const a of activities) {
    if (!actsByCity.has(a.cityId)) actsByCity.set(a.cityId, []);
    actsByCity.get(a.cityId)!.push(a);
  }

  const accomByCity = new Map<string, typeof accommodations>();
  for (const a of accommodations) {
    if (!accomByCity.has(a.cityId)) accomByCity.set(a.cityId, []);
    accomByCity.get(a.cityId)!.push(a);
  }

  const lines: string[] = [];

  const exportDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  lines.push(`# ${ctx.trip.name}`);
  lines.push("");
  lines.push(`_Exportado el ${exportDate}_`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const city of cities) {
    const flag = countryFlag(city.countryCode);
    const header = [flag, city.name, city.countryCode ? `(${city.countryCode})` : ""]
      .filter(Boolean)
      .join(" ");

    lines.push(`## ${header}`);
    lines.push("");

    const accomList = accomByCity.get(city.id) ?? [];
    if (accomList.length > 0) {
      lines.push("### Alojamiento");
      lines.push("");
      for (const ac of accomList) {
        lines.push(`**${ac.title}**  `);
        lines.push(
          `📅 ${formatDate(ac.startDate)} → ${formatDate(ac.endDate)}  `,
        );
        if (ac.mapsUrl) lines.push(`🗺 [Maps](${ac.mapsUrl})  `);
        if (ac.notesMd?.trim()) {
          lines.push("");
          lines.push(ac.notesMd.trim());
        }
        lines.push("");
      }
    }

    const actList = actsByCity.get(city.id) ?? [];
    if (actList.length > 0) {
      lines.push("### Actividades");
      lines.push("");
      for (const act of actList) {
        lines.push(`**${act.title}**  `);
        if (act.mapsUrl) lines.push(`🗺 [Maps](${act.mapsUrl})  `);
        if (act.notesMd?.trim()) {
          lines.push("");
          lines.push(act.notesMd.trim());
        }
        lines.push("");
      }
    }

    if (accomList.length === 0 && actList.length === 0) {
      lines.push("_Sin contenido agregado._");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  if (transports.length > 0) {
    lines.push("## Transportes");
    lines.push("");
    for (const t of transports) {
      const emoji = transportEmoji[t.mode] ?? "🚦";
      lines.push(
        `### ${emoji} ${t.fromName} → ${t.toName}`,
      );
      lines.push("");
      lines.push(`- **Salida:** ${formatDateTime(t.departureAt)}  `);
      lines.push(`- **Llegada:** ${formatDateTime(t.arrivalAt)}  `);
      if (t.company) lines.push(`- **Empresa:** ${t.company}  `);
      if (t.notesMd?.trim()) {
        lines.push("");
        lines.push(t.notesMd.trim());
      }
      lines.push("");
    }
  }

  const markdown = lines.join("\n");
  const filename = `${ctx.trip.name.toLowerCase().replace(/\s+/g, "-")}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
