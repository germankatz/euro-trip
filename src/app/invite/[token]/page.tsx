import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { AcceptButton } from "./AcceptButton";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      token: true,
      cityId: true,
      expiresAt: true,
      city: {
        select: {
          name: true,
          archivedAt: true,
          visibility: true,
          trip: { select: { name: true } },
        },
      },
    },
  });

  if (!invitation || !invitation.city || invitation.city.archivedAt) {
    return <ErrorCard message="Invitación no encontrada o expirada." />;
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return <ErrorCard message="Invitación no encontrada o expirada." />;
  }

  const cityName = invitation.city.name;
  const tripName = invitation.city.trip.name;

  if (!session?.user) {
    const callback = encodeURIComponent(`/invite/${token}`);
    return (
      <Card>
        <h1 className="text-2xl font-semibold">Te invitaron a {cityName}</h1>
        <p className="text-sm text-muted-foreground">
          Sumate al tramo de {cityName} en {tripName}. Iniciá sesión o registrate
          para aceptar la invitación.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={`/login?callbackUrl=${callback}`}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Ingresar
          </Link>
          <Link
            href={`/register?callbackUrl=${callback}`}
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "w-full",
            })}
          >
            Crear cuenta
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Te invitaron a {cityName}</h1>
      <p className="text-sm text-muted-foreground">
        Aceptá para sumarte al tramo de {cityName} en {tripName}.
      </p>
      <AcceptButton token={token} />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh grid place-items-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">{children}</div>
    </main>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <h1 className="text-2xl font-semibold">Invitación inválida</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/"
        className={buttonVariants({
          variant: "outline",
          size: "lg",
          className: "w-full",
        })}
      >
        Volver al inicio
      </Link>
    </Card>
  );
}
