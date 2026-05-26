/** Gera URL de busca no Google Maps para um endereço em texto livre. */
export function googleMapsUrlFromAddress(address: string | null | undefined): string | null {
  const t = address?.trim();
  if (!t) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
}

/** Normaliza tinyint/boolean vindos do MySQL ou do JSON. */
export function toBooleanFlag(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  }
  return !!value;
}
