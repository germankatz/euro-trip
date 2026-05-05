import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getTripContext,
  getVisibleCities,
  getTripMembers,
  getVisibleTransports,
  getVisibleActivities,
  getVisibleAccommodations,
} from "@/lib/trip";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ctx = await getTripContext({
    userId: session.user.id,
    userRole: session.user.role,
  });

  if (!ctx) {
    return (
      <main className="min-h-svh grid place-items-center bg-white p-8 text-center">
        <div className="space-y-2 max-w-md">
          <h1 className="text-[22px] font-semibold text-[var(--ink)]">
            No hay un Trip configurado
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Corré <code className="text-xs bg-[var(--surface-soft)] px-1.5 py-0.5 rounded">npm run db:seed</code> para crear el viaje inicial.
          </p>
        </div>
      </main>
    );
  }

  // El AppShell también necesita ver items archivados (en la sección
  // "Archivado" del detalle), por eso pedimos includeArchived.
  const [cities, allMembers] = await Promise.all([
    getVisibleCities({
      tripId: ctx.trip.id,
      userId: session.user.id,
      isSeed: ctx.isSeed,
    }),
    getTripMembers(ctx.trip.id),
  ]);

  const visibleCityIds = cities.map((c) => c.id);
  const [transports, activities, accommodations] = await Promise.all([
    getVisibleTransports({
      tripId: ctx.trip.id,
      visibleCityIds,
      isSeed: ctx.isSeed,
      includeArchived: true,
    }),
    getVisibleActivities({
      visibleCityIds,
      includeArchived: true,
    }),
    getVisibleAccommodations({
      visibleCityIds,
      includeArchived: true,
    }),
  ]);

  const otherTripMembers = allMembers.filter((m) => m.userId !== session.user.id);

  return (
    <AppShell
      trip={ctx.trip}
      cities={cities}
      transports={transports}
      activities={activities}
      accommodations={accommodations}
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      isTripMember={ctx.isTripMember}
      otherTripMembers={otherTripMembers}
    />
  );
}
