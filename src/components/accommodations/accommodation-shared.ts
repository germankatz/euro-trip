const dayMonthFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
});

const dayMonthYearFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatStayRange(startDate: Date, endDate: Date): string {
  if (sameDay(startDate, endDate)) {
    return dayMonthFmt.format(startDate);
  }
  return `${dayMonthFmt.format(startDate)} → ${dayMonthFmt.format(endDate)}`;
}

export function formatStayLong(d: Date): string {
  return dayMonthYearFmt.format(d);
}

export function nightsBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

/** ISO YYYY-MM-DD para `<input type="date">` */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
