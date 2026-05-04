"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { BottomSheet, type SheetState } from "@/components/sheet/BottomSheet";
import { Timeline } from "@/components/sheet/Timeline";
import { UserMenu } from "@/components/header/UserMenu";
import { CreateCityModal } from "@/components/cities/CreateCityModal";
import { CityActions } from "@/components/cities/CityActions";
import { TransportRow } from "@/components/transports/TransportRow";
import { TransportDetail } from "@/components/transports/TransportDetail";
import { CreateTransportModal } from "@/components/transports/CreateTransportModal";
import { ActivityRow } from "@/components/activities/ActivityRow";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import { CreateActivityModal } from "@/components/activities/CreateActivityModal";
import type {
  VisibleCity,
  TripMemberLite,
  VisibleTransport,
  VisibleActivity,
} from "@/lib/trip";
import type { Actor } from "@/lib/permissions";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-zinc-200" />,
});

type Selection =
  | { kind: "none" }
  | { kind: "city"; cityId: string }
  | { kind: "transport"; transportId: string; fromCityId: string | null }
  | { kind: "activity"; activityId: string; cityId: string };

type Props = {
  trip: { id: string; name: string };
  cities: VisibleCity[];
  transports: VisibleTransport[];
  activities: VisibleActivity[];
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "seed" | "member";
  };
  isTripMember: boolean;
  otherTripMembers: TripMemberLite[];
};

export function AppShell({
  trip,
  cities,
  transports,
  activities,
  user,
  isTripMember,
  otherTripMembers,
}: Props) {
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [sheetState, setSheetState] = useState<SheetState>("peek");
  const [createTransportFor, setCreateTransportFor] = useState<
    { city: VisibleCity; side: "from" | "to" } | null
  >(null);
  const [createActivityFor, setCreateActivityFor] = useState<VisibleCity | null>(null);

  const actor: Actor = {
    userId: user.id,
    role: user.role,
    isTripMember,
  };

  // Derivar la city que el mapa muestra (si estamos en city/transport/activity).
  const mapSelectedCityId =
    selection.kind === "city"
      ? selection.cityId
      : selection.kind === "activity"
        ? selection.cityId
        : selection.kind === "transport"
          ? selection.fromCityId
          : null;

  const selectedCity =
    selection.kind === "city"
      ? cities.find((c) => c.id === selection.cityId) ?? null
      : null;
  const selectedTransport =
    selection.kind === "transport"
      ? transports.find((t) => t.id === selection.transportId) ?? null
      : null;
  const selectedActivity =
    selection.kind === "activity"
      ? activities.find((a) => a.id === selection.activityId) ?? null
      : null;

  function handleSelectCity(id: string) {
    setSelection({ kind: "city", cityId: id });
    if (sheetState === "peek") setSheetState("half");
  }

  function handleSelectTransport(transportId: string, fromCityId: string | null) {
    setSelection({ kind: "transport", transportId, fromCityId });
    if (sheetState === "peek") setSheetState("half");
  }

  function handleSelectActivity(activityId: string, cityId: string) {
    setSelection({ kind: "activity", activityId, cityId });
    if (sheetState === "peek") setSheetState("half");
  }

  function backToCity() {
    if (selection.kind === "transport") {
      if (selection.fromCityId) {
        setSelection({ kind: "city", cityId: selection.fromCityId });
        return;
      }
    }
    if (selection.kind === "activity") {
      setSelection({ kind: "city", cityId: selection.cityId });
      return;
    }
    setSelection({ kind: "none" });
  }

  function clearSelection() {
    setSelection({ kind: "none" });
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MapCanvas
        cities={cities}
        selectedCityId={mapSelectedCityId}
        onSelectCity={handleSelectCity}
      />

      <UserMenu user={user} />

      <div className="absolute top-3 left-3 z-30 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur">
        {trip.name}
      </div>

      {isTripMember && selection.kind !== "city" && (
        <CreateCityModal
          members={otherTripMembers}
          onCreated={(id) => {
            setSelection({ kind: "city", cityId: id });
            setSheetState("half");
          }}
        />
      )}

      {createTransportFor && (
        <CreateTransportModal
          open
          onOpenChange={(o) => !o && setCreateTransportFor(null)}
          prefilledEndpoint={createTransportFor}
          tripCities={cities}
          onCreated={(id) => {
            setCreateTransportFor(null);
            handleSelectTransport(id, createTransportFor.city.id);
          }}
        />
      )}

      {createActivityFor && (
        <CreateActivityModal
          open
          onOpenChange={(o) => !o && setCreateActivityFor(null)}
          city={createActivityFor}
          onCreated={(id) => {
            handleSelectActivity(id, createActivityFor.id);
            setCreateActivityFor(null);
          }}
        />
      )}

      <BottomSheet state={sheetState} onStateChange={setSheetState}>
        <SheetContent
          state={sheetState}
          cities={cities}
          transports={transports}
          activities={activities}
          actor={actor}
          selectedCity={selectedCity}
          selectedTransport={selectedTransport}
          selectedActivity={selectedActivity}
          onSelectCity={handleSelectCity}
          onSelectTransport={handleSelectTransport}
          onSelectActivity={handleSelectActivity}
          onBack={backToCity}
          onClear={clearSelection}
          onAddTransport={(city, side) =>
            setCreateTransportFor({ city, side })
          }
          onAddActivity={(city) => setCreateActivityFor(city)}
        />
      </BottomSheet>
    </div>
  );
}

// =====================================================================
//  Sheet content (timeline / city detail / item detail)
// =====================================================================

type SheetContentProps = {
  state: SheetState;
  cities: VisibleCity[];
  transports: VisibleTransport[];
  activities: VisibleActivity[];
  actor: Actor;
  selectedCity: VisibleCity | null;
  selectedTransport: VisibleTransport | null;
  selectedActivity: VisibleActivity | null;
  onSelectCity: (id: string) => void;
  onSelectTransport: (id: string, fromCityId: string | null) => void;
  onSelectActivity: (id: string, cityId: string) => void;
  onBack: () => void;
  onClear: () => void;
  onAddTransport: (city: VisibleCity, side: "from" | "to") => void;
  onAddActivity: (city: VisibleCity) => void;
};

function SheetContent(props: SheetContentProps) {
  const {
    state,
    cities,
    transports,
    activities,
    actor,
    selectedCity,
    selectedTransport,
    selectedActivity,
    onSelectCity,
    onSelectTransport,
    onSelectActivity,
    onBack,
    onClear,
    onAddTransport,
    onAddActivity,
  } = props;

  // Item detail (transport/activity) tiene prioridad sobre city detail.
  if (selectedTransport && state !== "peek") {
    const fromCity = selectedTransport.fromCityId
      ? cities.find((c) => c.id === selectedTransport.fromCityId) ?? null
      : null;
    const toCity = selectedTransport.toCityId
      ? cities.find((c) => c.id === selectedTransport.toCityId) ?? null
      : null;
    return (
      <TransportDetail
        transport={selectedTransport}
        fromCity={fromCity}
        toCity={toCity}
        actor={actor}
        onBack={onBack}
        onAfterMutation={onBack}
      />
    );
  }

  if (selectedActivity && state !== "peek") {
    const parent = cities.find((c) => c.id === selectedActivity.cityId);
    if (!parent) {
      // Fallback raro: la city desapareció (archivada/eliminada en otra session).
      return null;
    }
    return (
      <ActivityDetail
        activity={selectedActivity}
        city={parent}
        actor={actor}
        onBack={onBack}
        onAfterMutation={onBack}
      />
    );
  }

  if (selectedCity && state !== "peek") {
    const arriving = transports.filter((t) => t.toCityId === selectedCity.id);
    const departing = transports.filter((t) => t.fromCityId === selectedCity.id);
    const cityActivities = activities.filter((a) => a.cityId === selectedCity.id);
    return (
      <CityDetail
        city={selectedCity}
        actor={actor}
        arrivingTransports={arriving}
        departingTransports={departing}
        activities={cityActivities}
        onBack={onClear}
        onSelectTransport={(id) => onSelectTransport(id, selectedCity.id)}
        onSelectActivity={(id) => onSelectActivity(id, selectedCity.id)}
        onAddTransport={(side) => onAddTransport(selectedCity, side)}
        onAddActivity={() => onAddActivity(selectedCity)}
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
        reorderable={actor.role === "seed" && state !== "peek"}
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

// =====================================================================
//  City detail (con secciones de transports, activities y archivados)
// =====================================================================

function CityDetail({
  city,
  actor,
  arrivingTransports,
  departingTransports,
  activities,
  onBack,
  onSelectTransport,
  onSelectActivity,
  onAddTransport,
  onAddActivity,
}: {
  city: VisibleCity;
  actor: Actor;
  arrivingTransports: VisibleTransport[];
  departingTransports: VisibleTransport[];
  activities: VisibleActivity[];
  onBack: () => void;
  onSelectTransport: (id: string) => void;
  onSelectActivity: (id: string) => void;
  onAddTransport: (side: "from" | "to") => void;
  onAddActivity: () => void;
}) {
  const arrivingActive = arrivingTransports.filter((t) => !t.archivedAt);
  const arrivingArchived = arrivingTransports.filter((t) => t.archivedAt);
  const activitiesActive = activities.filter((a) => !a.archivedAt);
  const activitiesArchived = activities.filter((a) => a.archivedAt);
  const departingActive = departingTransports.filter((t) => !t.archivedAt);
  const departingArchived = departingTransports.filter((t) => t.archivedAt);

  const archivedCount =
    arrivingArchived.length + activitiesArchived.length + departingArchived.length;

  const canAdd = actor.isTripMember;

  return (
    <div className="px-4 space-y-5">
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
        {arrivingActive.length === 0 ? (
          <Empty>Todavía no hay transportes hacia esta ciudad.</Empty>
        ) : (
          <ul className="space-y-2">
            {arrivingActive.map((t) => (
              <li key={t.id}>
                <TransportRow transport={t} onClick={() => onSelectTransport(t.id)} />
              </li>
            ))}
          </ul>
        )}
        {canAdd && (
          <AddInlineButton onClick={() => onAddTransport("to")}>
            Agregar transporte hacia aquí
          </AddInlineButton>
        )}
      </Section>

      <Section title="Qué hacer">
        {activitiesActive.length === 0 ? (
          <Empty>Todavía no hay actividades cargadas.</Empty>
        ) : (
          <ul className="space-y-2">
            {activitiesActive.map((a) => (
              <li key={a.id}>
                <ActivityRow activity={a} onClick={() => onSelectActivity(a.id)} />
              </li>
            ))}
          </ul>
        )}
        {canAdd && (
          <AddInlineButton onClick={onAddActivity}>
            Agregar actividad
          </AddInlineButton>
        )}
      </Section>

      <Section title="Cómo te vas">
        {departingActive.length === 0 ? (
          <Empty>Todavía no hay transportes desde esta ciudad.</Empty>
        ) : (
          <ul className="space-y-2">
            {departingActive.map((t) => (
              <li key={t.id}>
                <TransportRow transport={t} onClick={() => onSelectTransport(t.id)} />
              </li>
            ))}
          </ul>
        )}
        {canAdd && (
          <AddInlineButton onClick={() => onAddTransport("from")}>
            Agregar transporte desde aquí
          </AddInlineButton>
        )}
      </Section>

      {archivedCount > 0 && (
        <details className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">
            Archivado ({archivedCount})
          </summary>
          <div className="mt-3 space-y-3">
            {arrivingArchived.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Cómo llegás
                </p>
                <ul className="space-y-2">
                  {arrivingArchived.map((t) => (
                    <li key={t.id}>
                      <TransportRow
                        transport={t}
                        archived
                        onClick={() => onSelectTransport(t.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activitiesArchived.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Qué hacer
                </p>
                <ul className="space-y-2">
                  {activitiesArchived.map((a) => (
                    <li key={a.id}>
                      <ActivityRow
                        activity={a}
                        archived
                        onClick={() => onSelectActivity(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {departingArchived.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Cómo te vas
                </p>
                <ul className="space-y-2">
                  {departingArchived.map((t) => (
                    <li key={t.id}>
                      <TransportRow
                        transport={t}
                        archived
                        onClick={() => onSelectTransport(t.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
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

function AddInlineButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}
