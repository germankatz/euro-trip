"use client";

import { useState } from "react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { BottomSheet, type SheetState } from "@/components/sheet/BottomSheet";
import { Timeline } from "@/components/sheet/Timeline";
import { UserMenu } from "@/components/header/UserMenu";
import type { VisibleCity } from "@/lib/trip";

type Props = {
  trip: { id: string; name: string };
  cities: VisibleCity[];
  user: { name?: string | null; email?: string | null; role: "seed" | "member" };
  isTripMember: boolean;
};

export function AppShell({ trip, cities, user, isTripMember }: Props) {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("peek");

  const selectedCity = cities.find((c) => c.id === selectedCityId) ?? null;

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

      <BottomSheet state={sheetState} onStateChange={setSheetState}>
        <SheetContent
          state={sheetState}
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={handleSelectCity}
          onBack={() => setSelectedCityId(null)}
          isTripMember={isTripMember}
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
  isTripMember,
}: {
  state: SheetState;
  cities: VisibleCity[];
  selectedCity: VisibleCity | null;
  onSelectCity: (id: string) => void;
  onBack: () => void;
  isTripMember: boolean;
}) {
  if (selectedCity && state !== "peek") {
    return (
      <CityDetail
        city={selectedCity}
        onBack={onBack}
        isTripMember={isTripMember}
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
          {isTripMember
            ? "Tirá una ciudad para ver el detalle. Próximo: botón para crear ciudad/transporte/actividad."
            : "Estás viendo el viaje en modo lectura. Pedile al organizador que te invite al trip para crear o editar."}
        </div>
      )}
    </div>
  );
}

function CityDetail({
  city,
  onBack,
  isTripMember: _isTripMember,
}: {
  city: VisibleCity;
  onBack: () => void;
  isTripMember: boolean;
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
      </div>

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
