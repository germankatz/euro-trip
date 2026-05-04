"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BottomSheet, type SheetState } from "@/components/sheet/BottomSheet";
import { Timeline } from "@/components/sheet/Timeline";
import { UserMenu } from "@/components/header/UserMenu";
import { CreateCityModal } from "@/components/cities/CreateCityModal";
import { CityActions } from "@/components/cities/CityActions";
import type { VisibleCity, TripMemberLite } from "@/lib/trip";
import type { Actor } from "@/lib/permissions";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-zinc-200" />,
});

type Props = {
  trip: { id: string; name: string };
  cities: VisibleCity[];
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "seed" | "member";
  };
  isTripMember: boolean;
  /** Otros TripMembers (sin el actual) — para el selector de invitados */
  otherTripMembers: TripMemberLite[];
};

export function AppShell({
  trip,
  cities,
  user,
  isTripMember,
  otherTripMembers,
}: Props) {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("peek");

  const selectedCity = cities.find((c) => c.id === selectedCityId) ?? null;

  const actor: Actor = {
    userId: user.id,
    role: user.role,
    isTripMember,
  };

  function handleSelectCity(id: string) {
    setSelectedCityId(id);
    if (sheetState === "peek") setSheetState("half");
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MapCanvas
        cities={cities}
        selectedCityId={selectedCityId}
        onSelectCity={handleSelectCity}
      />

      <UserMenu user={user} />

      <div className="absolute top-3 left-3 z-30 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur">
        {trip.name}
      </div>

      {isTripMember && (
        <CreateCityModal
          members={otherTripMembers}
          onCreated={(id) => {
            setSelectedCityId(id);
            setSheetState("half");
          }}
        />
      )}

      <BottomSheet state={sheetState} onStateChange={setSheetState}>
        <SheetContent
          state={sheetState}
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={handleSelectCity}
          onBack={() => setSelectedCityId(null)}
          actor={actor}
        />
      </BottomSheet>
    </div>
  );
}

function SheetContent({
  state,
  cities,
  selectedCity,
  onSelectCity,
  onBack,
  actor,
}: {
  state: SheetState;
  cities: VisibleCity[];
  selectedCity: VisibleCity | null;
  onSelectCity: (id: string) => void;
  onBack: () => void;
  actor: Actor;
}) {
  if (selectedCity && state !== "peek") {
    return (
      <CityDetail
        city={selectedCity}
        actor={actor}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="space-y-4 pt-1">
      <Timeline
        cities={cities}
        selectedCityId={selectedCity?.id ?? null}
        onSelectCity={onSelectCity}
        grouped={state !== "peek"}
      />

      {state === "full" && (
        <div className="px-4 pt-2 text-xs text-zinc-500">
          {actor.isTripMember
            ? "Tocá una ciudad para ver el detalle, o usá el botón + para agregar una nueva."
            : "Estás viendo el viaje en modo lectura. Pedile al organizador que te invite al trip para crear o editar."}
        </div>
      )}
    </div>
  );
}

function CityDetail({
  city,
  actor,
  onBack,
}: {
  city: VisibleCity;
  actor: Actor;
  onBack: () => void;
}) {
  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-zinc-200 px-2.5 py-1 text-sm hover:bg-zinc-50"
          aria-label="Volver al timeline"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold truncate">{city.name}</h2>
        {city.visibility === "group" && (
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 border border-dashed border-zinc-400 rounded px-1.5 py-0.5">
            grupo
          </span>
        )}
        {city.archivedAt && (
          <span className="text-[10px] uppercase tracking-wider text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 bg-amber-50">
            archivada
          </span>
        )}
      </div>

      <CityActions actor={actor} city={city} onAfterMutation={onBack} />

      <Section title="Cómo llegás">
        <Empty>Todavía no hay transportes hacia esta ciudad.</Empty>
      </Section>

      <Section title="Qué hacer">
        <Empty>Todavía no hay actividades cargadas.</Empty>
      </Section>

      <Section title="Cómo te vas">
        <Empty>Todavía no hay transportes desde esta ciudad.</Empty>
      </Section>

      <p className="text-xs text-zinc-400">
        Próximo: vista de transports + activities + crear/editar/archivar.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-700">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-3 py-4 text-sm text-zinc-500">
      {children}
    </div>
  );
}
