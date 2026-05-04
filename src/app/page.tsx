import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getTripContext,
  getVisibleCities,
  getTripMembers,
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
      <main className="min-h-svh grid place-items-center p-8 text-center">
        <div className="space-y-2 max-w-md">
          <h1 className="text-xl font-semibold">No hay un Trip configurado</h1>
          <p className="text-sm text-zinc-600">
            Corré <code className="text-xs bg-zinc-100 px-1 rounded">npm run db:seed</code> para crear el viaje inicial.
          </p>
        </div>
      </main>
    );
  }

  const [cities, allMembers] = await Promise.all([
    getVisibleCities({
      tripId: ctx.trip.id,
      userId: session.user.id,
      isSeed: ctx.isSeed,
    }),
    getTripMembers(ctx.trip.id),
  ]);

  const otherTripMembers = allMembers.filter((m) => m.userId !== session.user.id);

  return (
    <AppShell
      trip={ctx.trip}
      cities={cities}
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
