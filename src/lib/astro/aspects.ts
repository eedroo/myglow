import type { BodyKey, NatalChart } from '@/types/astro';
import { signedDeg } from './zodiac';

/** Aspectos entre planetas em trânsito e pontos do mapa natal. Puro. */
export type AspectType = 'CONJUNCTION' | 'SEXTILE' | 'SQUARE' | 'TRINE' | 'OPPOSITION';

export interface Aspect {
  transit: BodyKey; // planeta em trânsito
  natal: BodyKey | 'ASC'; // ponto natal
  type: AspectType;
  orb: number; // graus, 1 casa decimal
  label: string; // chave estável: "MOON_TRINE_NATAL_SUN"
}

export const ASPECT_ANGLES: Record<AspectType, number> = { CONJUNCTION: 0, SEXTILE: 60, SQUARE: 90, TRINE: 120, OPPOSITION: 180 };
export const ORBS: Record<AspectType, number> = { CONJUNCTION: 8, OPPOSITION: 8, SQUARE: 6, TRINE: 6, SEXTILE: 4 };

export const TRANSIT_BODIES: BodyKey[] = ['MOON', 'SUN', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN'];
export const NATAL_POINTS: (BodyKey | 'ASC')[] = ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'ASC'];

const ASPECT_TYPES = Object.keys(ASPECT_ANGLES) as AspectType[];
const round1 = (n: number) => Math.round(n * 10) / 10;

export function aspectLabel(transit: BodyKey, type: AspectType, natal: BodyKey | 'ASC'): string {
  return `${transit}_${type}_NATAL_${natal}`;
}

/** Longitude de um ponto natal (null se não existe, ex.: ASC sem hora). */
export function natalLongitude(natal: NatalChart, point: BodyKey | 'ASC'): number | null {
  if (point === 'ASC') return natal.ascendant?.longitude ?? null;
  return natal.bodies[point].longitude;
}

/** Orbe máximo para um aspecto; a Lua em trânsito usa metade. */
export function orbLimit(type: AspectType, transit: BodyKey): number {
  return transit === 'MOON' ? ORBS[type] / 2 : ORBS[type];
}

/** Aspectos dentro do orbe, ordenados por orbe (mais exactos primeiro). */
export function findAspects(transits: Partial<Record<BodyKey, number>>, natal: NatalChart, maxResults = 5): Aspect[] {
  const found: Aspect[] = [];
  for (const transit of TRANSIT_BODIES) {
    const t = transits[transit];
    if (t === undefined) continue;
    for (const point of NATAL_POINTS) {
      const n = natalLongitude(natal, point);
      if (n === null) continue;
      const separation = Math.abs(signedDeg(t - n)); // 0–180
      let best: Aspect | null = null;
      for (const type of ASPECT_TYPES) {
        const dev = Math.abs(separation - ASPECT_ANGLES[type]);
        if (dev <= orbLimit(type, transit) && (!best || dev < best.orb)) {
          best = { transit, natal: point, type, orb: round1(dev), label: aspectLabel(transit, type, point) };
        }
      }
      if (best) found.push(best);
    }
  }
  return found.sort((a, b) => a.orb - b.orb).slice(0, maxResults);
}
