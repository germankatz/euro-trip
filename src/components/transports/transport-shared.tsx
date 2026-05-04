export const TRANSPORT_MODES = [
  { value: "plane", label: "Avión", icon: "✈" },
  { value: "bus", label: "Bus", icon: "🚌" },
  { value: "train", label: "Tren", icon: "🚂" },
  { value: "car", label: "Auto", icon: "🚗" },
  { value: "ferry", label: "Ferry", icon: "⛴" },
  { value: "other", label: "Otro", icon: "●" },
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number]["value"];

export function modeMeta(mode: TransportMode): { label: string; icon: string } {
  const found = TRANSPORT_MODES.find((m) => m.value === mode);
  return found ? { label: found.label, icon: found.icon } : { label: "Otro", icon: "●" };
}

const dayMonthFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
});

const timeFmt = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTransportRange(departureAt: Date, arrivalAt: Date): string {
  const dep = `${dayMonthFmt.format(departureAt)} ${timeFmt.format(departureAt)}`;
  if (sameDay(departureAt, arrivalAt)) {
    return `${dep} → ${timeFmt.format(arrivalAt)}`;
  }
  const arr = `${dayMonthFmt.format(arrivalAt)} ${timeFmt.format(arrivalAt)}`;
  return `${dep} → ${arr}`;
}
