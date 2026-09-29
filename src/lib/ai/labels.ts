/** Rótulos estáveis de aspectos ("MARS_CONJUNCTION_NATAL_MOON") para a UI. Puro. */
export const ASPECT_SYMBOLS: Record<string, string> = {
  CONJUNCTION: '☌',
  SEXTILE: '⚹',
  SQUARE: '□',
  TRINE: '△',
  OPPOSITION: '☍',
};

export function parseAspectLabel(label: string): { transit: string; type: string; natal: string } | null {
  const m = /^([A-Z]+)_(CONJUNCTION|SEXTILE|SQUARE|TRINE|OPPOSITION)_NATAL_([A-Z]+)$/.exec(label);
  return m ? { transit: m[1]!, type: m[2]!, natal: m[3]! } : null;
}
