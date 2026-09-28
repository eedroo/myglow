import type { ZodiacSign } from '@prisma/client';
import type { ZodiacPosition } from '@/types/astro';

export const ZODIAC_ORDER: ZodiacSign[] = [
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
];

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Normaliza para [0, 360). */
export function normalizeDeg(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** Normaliza para [−180, 180). */
export function signedDeg(x: number): number {
  return normalizeDeg(x + 180) - 180;
}

export function signIndex(longitude: number): number {
  return Math.floor(normalizeDeg(longitude) / 30) % 12;
}

export function toZodiacPosition(longitude: number): ZodiacPosition {
  const lon = normalizeDeg(longitude);
  const idx = signIndex(lon);
  return { longitude: lon, sign: ZODIAC_ORDER[idx]!, degree: lon - idx * 30 };
}
