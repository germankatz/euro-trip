import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  const trip = await prisma.trip.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { cities: true, members: true } },
    },
  });

  return (
    <main className="min-h-svh p-8 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{trip?.name ?? "Travel app"}</h1>
        <form action={logoutAction}>
          <Button variant="ghost" type="submit">
            Salir ({session?.user?.email})
          </Button>
        </form>
      </header>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-medium">Estado del setup</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Trip: {trip ? `"${trip.name}"` : "no creado todavía"}</li>
          <li>• Ciudades cargadas: {trip?._count.cities ?? 0}</li>
          <li>• Miembros del trip: {trip?._count.members ?? 0}</li>
          <li>• Tu rol: <code>{session?.user?.role}</code></li>
        </ul>
      </section>

      <p className="text-sm text-muted-foreground">
        Próximo paso: mapa fullscreen + bottom card + CRUD de ciudades.
      </p>
    </main>
  );
}
