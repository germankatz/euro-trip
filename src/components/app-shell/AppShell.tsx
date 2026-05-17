"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { BottomSheet, type SheetState } from "@/components/sheet/BottomSheet";
import { CitiesList } from "@/components/sheet/CitiesList";
import { UserMenu } from "@/components/header/UserMenu";
import { CreateCityModal } from "@/components/cities/CreateCityModal";
import { CityActions } from "@/components/cities/CityActions";
import { TransportRow } from "@/components/transports/TransportRow";
import { TransportDetail } from "@/components/transports/TransportDetail";
import { CreateTransportModal } from "@/components/transports/CreateTransportModal";
import { ActivityRow } from "@/components/activities/ActivityRow";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import { CreateActivityModal } from "@/components/activities/CreateActivityModal";
import { AccommodationRow } from "@/components/accommodations/AccommodationRow";
import { AccommodationDetail } from "@/components/accommodations/AccommodationDetail";
import { CreateAccommodationModal } from "@/components/accommodations/CreateAccommodationModal";
import { DetailHeader } from "@/components/ui/detail-header";
import { SheetSection, SheetEmpty } from "@/components/ui/sheet-section";
import { Badge } from "@/components/ui/badge";
import type {
  VisibleCity,
  TripMemberLite,
  VisibleTransport,
  VisibleActivity,
  VisibleAccommodation,
} from "@/lib/trip";
import type { Actor } from "@/lib/permissions";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[var(--surface-strong)]" />,
});

type Selection =
  | { kind: "none" }
  | { kind: "city"; cityId: string }
  | { kind: "transport"; transportId: string; fromCityId: string | null }
  | { kind: "activity"; activityId: string; cityId: string }
  | { kind: "accommodation"; accommodationId: string; cityId: string };

type Props = {
  trip: { id: string; name: string };
  cities: VisibleCity[];
  transports: VisibleTransport[];
  activities: VisibleActivity[];
  accommodations: VisibleAccommodation[];
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
  accommodations,
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
  const [createAccommodationFor, setCreateAccommodationFor] =
    useState<VisibleCity | null>(null);

  const actor: Actor = {
    userId: user.id,
    role: user.role,
    isTripMember,
  };

  // Derivar la city que el mapa debe centrar.
  const mapSelectedCityId =
    selection.kind === "city"
      ? selection.cityId
      : selection.kind === "activity"
        ? selection.cityId
        : selection.kind === "accommodation"
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
  const selectedAccommodation =
    selection.kind === "accommodation"
      ? accommodations.find((a) => a.id === selection.accommodationId) ?? null
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

  function handleSelectAccommodation(accommodationId: string, cityId: string) {
    setSelection({ kind: "accommodation", accommodationId, cityId });
    if (sheetState === "peek") setSheetState("half");
  }

  /**
   * Único handler de "volver": sube exactamente un nivel en la jerarquía
   * home → city → item.
   */
  function handleBack() {
    if (selection.kind === "transport") {
      if (selection.fromCityId) {
        setSelection({ kind: "city", cityId: selection.fromCityId });
        return;
      }
      setSelection({ kind: "none" });
      return;
    }
    if (selection.kind === "activity") {
      setSelection({ kind: "city", cityId: selection.cityId });
      return;
    }
    if (selection.kind === "accommodation") {
      setSelection({ kind: "city", cityId: selection.cityId });
      return;
    }
    if (selection.kind === "city") {
      setSelection({ kind: "none" });
      return;
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MapCanvas
        cities={cities}
        activities={activities}
        accommodations={accommodations}
        selectedCityId={mapSelectedCityId}
        selectedActivityId={
          selection.kind === "activity" ? selection.activityId : null
        }
        selectedAccommodationId={
          selection.kind === "accommodation" ? selection.accommodationId : null
        }
        onSelectCity={handleSelectCity}
        onSelectActivity={handleSelectActivity}
        onSelectAccommodation={handleSelectAccommodation}
        onMapBackground={() => {
          if (selection.kind === "activity") handleBack();
          else if (selection.kind === "accommodation") handleBack();
        }}
        sheetState={sheetState}
      />

      <UserMenu
        user={user}
        shareableCities={cities
          .filter((c) => c.visibility === "group" && !c.archivedAt)
          .map((c) => ({ id: c.id, name: c.name }))}
      />

      <div className="absolute top-3 left-3 z-30 rounded-full border border-[var(--hairline)] bg-white px-3.5 py-1.5 text-[14px] font-semibold text-[var(--ink)] shadow-[var(--shadow-card)]">
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

      {createAccommodationFor && (
        <CreateAccommodationModal
          open
          onOpenChange={(o) => !o && setCreateAccommodationFor(null)}
          city={createAccommodationFor}
          onCreated={(id) => {
            handleSelectAccommodation(id, createAccommodationFor.id);
            setCreateAccommodationFor(null);
          }}
        />
      )}

      <BottomSheet state={sheetState} onStateChange={setSheetState}>
        <SheetContent
          state={sheetState}
          cities={cities}
          transports={transports}
          activities={activities}
          accommodations={accommodations}
          actor={actor}
          selectedCity={selectedCity}
          selectedTransport={selectedTransport}
          selectedActivity={selectedActivity}
          selectedAccommodation={selectedAccommodation}
          onSelectCity={handleSelectCity}
          onSelectTransport={handleSelectTransport}
          onSelectActivity={handleSelectActivity}
          onSelectAccommodation={handleSelectAccommodation}
          onBack={handleBack}
          onAddTransport={(city, side) =>
            setCreateTransportFor({ city, side })
          }
          onAddActivity={(city) => setCreateActivityFor(city)}
          onAddAccommodation={(city) => setCreateAccommodationFor(city)}
        />
      </BottomSheet>
    </div>
  );
}

// =====================================================================
//  Sheet content (cities list / city detail / item detail)
// =====================================================================

type SheetContentProps = {
  state: SheetState;
  cities: VisibleCity[];
  transports: VisibleTransport[];
  activities: VisibleActivity[];
  accommodations: VisibleAccommodation[];
  actor: Actor;
  selectedCity: VisibleCity | null;
  selectedTransport: VisibleTransport | null;
  selectedActivity: VisibleActivity | null;
  selectedAccommodation: VisibleAccommodation | null;
  onSelectCity: (id: string) => void;
  onSelectTransport: (id: string, fromCityId: string | null) => void;
  onSelectActivity: (id: string, cityId: string) => void;
  onSelectAccommodation: (id: string, cityId: string) => void;
  onBack: () => void;
  onAddTransport: (city: VisibleCity, side: "from" | "to") => void;
  onAddActivity: (city: VisibleCity) => void;
  onAddAccommodation: (city: VisibleCity) => void;
};

function SheetContent(props: SheetContentProps) {
  const {
    state,
    cities,
    transports,
    activities,
    accommodations,
    actor,
    selectedCity,
    selectedTransport,
    selectedActivity,
    selectedAccommodation,
    onSelectCity,
    onSelectTransport,
    onSelectActivity,
    onSelectAccommodation,
    onBack,
    onAddTransport,
    onAddActivity,
    onAddAccommodation,
  } = props;

  // Item detail (transport/activity) — máxima prioridad.
  if (selectedTransport) {
    const fromCity = selectedTransport.fromCityId
      ? cities.find((c) => c.id === selectedTransport.fromCityId) ?? null
      : null;
    const toCity = selectedTransport.toCityId
      ? cities.find((c) => c.id === selectedTransport.toCityId) ?? null
      : null;
    return (
      <div className="px-4">
        <TransportDetail
          transport={selectedTransport}
          fromCity={fromCity}
          toCity={toCity}
          actor={actor}
          onBack={onBack}
          onAfterMutation={onBack}
        />
      </div>
    );
  }

  if (selectedActivity) {
    const parent = cities.find((c) => c.id === selectedActivity.cityId);
    if (!parent) return null;
    return (
      <div className="px-4">
        <ActivityDetail
          activity={selectedActivity}
          city={parent}
          actor={actor}
          onBack={onBack}
          onAfterMutation={onBack}
        />
      </div>
    );
  }

  if (selectedAccommodation) {
    const parent = cities.find((c) => c.id === selectedAccommodation.cityId);
    if (!parent) return null;
    return (
      <div className="px-4">
        <AccommodationDetail
          accommodation={selectedAccommodation}
          city={parent}
          actor={actor}
          onBack={onBack}
          onAfterMutation={onBack}
        />
      </div>
    );
  }

  if (selectedCity) {
    const arriving = transports.filter((t) => t.toCityId === selectedCity.id);
    const departing = transports.filter((t) => t.fromCityId === selectedCity.id);
    const cityActivities = activities.filter((a) => a.cityId === selectedCity.id);
    const cityAccommodations = accommodations.filter(
      (a) => a.cityId === selectedCity.id
    );
    return (
      <CityDetail
        city={selectedCity}
        actor={actor}
        arrivingTransports={arriving}
        departingTransports={departing}
        activities={cityActivities}
        accommodations={cityAccommodations}
        onBack={onBack}
        onSelectTransport={(id) => onSelectTransport(id, selectedCity.id)}
        onSelectActivity={(id) => onSelectActivity(id, selectedCity.id)}
        onSelectAccommodation={(id) => onSelectAccommodation(id, selectedCity.id)}
        onAddTransport={(side) => onAddTransport(selectedCity, side)}
        onAddActivity={() => onAddActivity(selectedCity)}
        onAddAccommodation={() => onAddAccommodation(selectedCity)}
      />
    );
  }

  // Home: lista vertical plana de ciudades.
  return (
    <CitiesList
      cities={cities}
      accommodations={accommodations}
      onSelectCity={onSelectCity}
      intro={
        state === "full"
          ? actor.isTripMember
            ? "Tocá una ciudad para ver el detalle. Usá el botón + para agregar una nueva."
            : "Estás viendo el viaje en modo lectura."
          : undefined
      }
    />
  );
}

// =====================================================================
//  City detail (transports + activities + archivado)
// =====================================================================

function formatCityDate(date: Date): string {
  const dayOfWeek = date.toLocaleDateString("es-AR", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("es-AR", { month: "long" });
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${day} de ${month} · ${hh}:${mm}`;
}

function CityTravelSummary({
  arrivingTransports,
  departingTransports,
}: {
  arrivingTransports: VisibleTransport[];
  departingTransports: VisibleTransport[];
}) {
  const arrival = arrivingTransports
    .filter((t) => !t.archivedAt && t.arrivalAt)
    .sort((a, b) => new Date(a.arrivalAt!).getTime() - new Date(b.arrivalAt!).getTime())[0];

  const departure = departingTransports
    .filter((t) => !t.archivedAt && t.departureAt)
    .sort((a, b) => new Date(a.departureAt!).getTime() - new Date(b.departureAt!).getTime())[0];

  if (!arrival && !departure) return null;

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-[13px]">
      {arrival && (
        <div className="flex items-baseline gap-2">
          <span className="w-14 shrink-0 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
            Llegada
          </span>
          <span className="text-[var(--ink)]">
            {formatCityDate(new Date(arrival.arrivalAt!))}
          </span>
        </div>
      )}
      {departure && (
        <div className="flex items-baseline gap-2">
          <span className="w-14 shrink-0 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
            Salida
          </span>
          <span className="text-[var(--ink)]">
            {formatCityDate(new Date(departure.departureAt!))}
          </span>
        </div>
      )}
    </div>
  );
}

function CityDetail({
  city,
  actor,
  arrivingTransports,
  departingTransports,
  activities,
  accommodations,
  onBack,
  onSelectTransport,
  onSelectActivity,
  onSelectAccommodation,
  onAddTransport,
  onAddActivity,
  onAddAccommodation,
}: {
  city: VisibleCity;
  actor: Actor;
  arrivingTransports: VisibleTransport[];
  departingTransports: VisibleTransport[];
  activities: VisibleActivity[];
  accommodations: VisibleAccommodation[];
  onBack: () => void;
  onSelectTransport: (id: string) => void;
  onSelectActivity: (id: string) => void;
  onSelectAccommodation: (id: string) => void;
  onAddTransport: (side: "from" | "to") => void;
  onAddActivity: () => void;
  onAddAccommodation: () => void;
}) {
  const arrivingActive = arrivingTransports.filter((t) => !t.archivedAt);
  const arrivingArchived = arrivingTransports.filter((t) => t.archivedAt);
  const accommodationsActive = accommodations.filter((a) => !a.archivedAt);
  const accommodationsArchived = accommodations.filter((a) => a.archivedAt);
  const activitiesActive = activities.filter((a) => !a.archivedAt);
  const activitiesArchived = activities.filter((a) => a.archivedAt);
  const departingActive = departingTransports.filter((t) => !t.archivedAt);
  const departingArchived = departingTransports.filter((t) => t.archivedAt);

  const archivedCount =
    arrivingArchived.length +
    accommodationsArchived.length +
    activitiesArchived.length +
    departingArchived.length;

  const canAdd = actor.isTripMember;

  return (
    <div className="px-4 space-y-6">
      <DetailHeader
        onBack={onBack}
        title={city.name}
        meta={
          <>
            {city.visibility === "group" && (
              <Badge
                variant="outline"
                className="border-dashed text-[10px] uppercase tracking-wider"
              >
                privada
              </Badge>
            )}
            {city.archivedAt && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                archivada
              </Badge>
            )}
          </>
        }
        actions={
          <CityActions actor={actor} city={city} onAfterMutation={onBack} />
        }
      />

      <CityTravelSummary
        arrivingTransports={arrivingTransports}
        departingTransports={departingTransports}
      />

      <SheetSection title="Cómo llegás">
        {arrivingActive.length === 0 ? (
          <SheetEmpty>Todavía no hay transportes hacia esta ciudad.</SheetEmpty>
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
      </SheetSection>

      <SheetSection title="Dónde me alojo">
        {accommodationsActive.length === 0 ? (
          <SheetEmpty>Todavía no hay alojamientos cargados.</SheetEmpty>
        ) : (
          <ul className="space-y-2">
            {accommodationsActive.map((a) => (
              <li key={a.id}>
                <AccommodationRow
                  accommodation={a}
                  onClick={() => onSelectAccommodation(a.id)}
                />
              </li>
            ))}
          </ul>
        )}
        {canAdd && (
          <AddInlineButton onClick={onAddAccommodation}>
            Agregar alojamiento
          </AddInlineButton>
        )}
      </SheetSection>

      <SheetSection title="Qué hacer">
        {activitiesActive.length === 0 ? (
          <SheetEmpty>Todavía no hay actividades cargadas.</SheetEmpty>
        ) : (
          <ul className="space-y-2">
            {activitiesActive.map((a) => (
              <li key={a.id}>
                <ActivityRow activity={a} actor={actor} onClick={() => onSelectActivity(a.id)} />
              </li>
            ))}
          </ul>
        )}
        {canAdd && (
          <AddInlineButton onClick={onAddActivity}>
            Agregar actividad
          </AddInlineButton>
        )}
      </SheetSection>

      <SheetSection title="Cómo te vas">
        {departingActive.length === 0 ? (
          <SheetEmpty>Todavía no hay transportes desde esta ciudad.</SheetEmpty>
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
      </SheetSection>

      {archivedCount > 0 && (
        <details className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-soft)]/60 px-3.5 py-2.5">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
            Archivado ({archivedCount})
          </summary>
          <div className="mt-3 space-y-3">
            {arrivingArchived.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
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
            {accommodationsArchived.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Dónde me alojo
                </p>
                <ul className="space-y-2">
                  {accommodationsArchived.map((a) => (
                    <li key={a.id}>
                      <AccommodationRow
                        accommodation={a}
                        archived
                        onClick={() => onSelectAccommodation(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activitiesArchived.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Qué hacer
                </p>
                <ul className="space-y-2">
                  {activitiesArchived.map((a) => (
                    <li key={a.id}>
                      <ActivityRow
                        activity={a}
                        actor={actor}
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
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
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
      className="flex items-center gap-1.5 text-sm font-medium text-[var(--ink)] underline underline-offset-4 decoration-[var(--hairline)] hover:decoration-[var(--ink)]"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}
