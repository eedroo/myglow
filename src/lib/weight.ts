/** Peso: kg na UI (vírgula ou ponto), gramas inteiras na DB. */

const KG_RE = /^\d{1,3}(\.\d{1,3})?$/;

/** "76,250" | "76.25" | "76" → 76250; '' → null; inválido → lança. */
export function parseKgToGrams(input: string): number | null {
  const v = input.trim().replace(',', '.');
  if (v === '') return null;
  if (!KG_RE.test(v)) throw new Error(`Invalid weight: ${input}`);
  return Math.round(Number(v) * 1000);
}

/** 76250 → "76,25" (pt) / "76.25" (en); até 2 casas, sem zeros à direita. */
export function formatGramsAsKg(grams: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false }).format(
    grams / 1000,
  );
}

/** −400 → "−0,4 kg", +250 → "+0,25 kg", 0 → "=". */
export function formatDeltaKg(grams: number, locale: string): string {
  if (grams === 0) return '=';
  const sign = grams < 0 ? '−' : '+';
  return `${sign}${formatGramsAsKg(Math.abs(grams), locale)} kg`;
}
