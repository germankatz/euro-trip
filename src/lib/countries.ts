/**
 * Helpers para mostrar países a partir de su código ISO 3166-1 alpha-2.
 * Usamos `Intl.DisplayNames` (es-AR) para el nombre y un cálculo de
 * regional indicators para la bandera emoji.
 */

let cachedDn: Intl.DisplayNames | null = null;

function getDn(): Intl.DisplayNames {
  if (cachedDn) return cachedDn;
  cachedDn = new Intl.DisplayNames(["es-AR", "es"], { type: "region" });
  return cachedDn;
}

export function countryName(countryCode: string | null | undefined): string {
  if (!countryCode) return "Sin país";
  const cc = countryCode.toUpperCase();
  if (cc.length !== 2) return cc;
  try {
    return getDn().of(cc) ?? cc;
  } catch {
    return cc;
  }
}

export function flagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode) return "";
  const cc = countryCode.toUpperCase();
  if (cc.length !== 2) return "";
  const A = 0x41;
  const REGIONAL_INDICATOR = 0x1f1e6;
  return String.fromCodePoint(
    REGIONAL_INDICATOR + (cc.charCodeAt(0) - A),
    REGIONAL_INDICATOR + (cc.charCodeAt(1) - A),
  );
}
