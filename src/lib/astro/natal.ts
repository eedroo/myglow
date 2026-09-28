import * as Astronomy from 'astronomy-engine';
import type { BodyKey, NatalBody, NatalChart, ZodiacPosition } from '@/types/astro';
import { dayBoundsUtc, type DateISO } from '@/lib/dates';
import { computeAngles } from './angles';
import { moonLongitude } from './moon';
import { signIndex, signedDeg, toZodiacPosition } from './zodiac';

export const BODY_KEYS: BodyKey[] = ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO'];

const PLANETS: Partial<Record<BodyKey, Astronomy.Body>> = {
  MERCURY: Astronomy.Body.Mercury,
  VENUS: Astronomy.Body.Venus,
  MARS: Astronomy.Body.Mars,
  JUPITER: Astronomy.Body.Jupiter,
  SATURN: Astronomy.Body.Saturn,
  URANUS: Astronomy.Body.Uranus,
  NEPTUNE: Astronomy.Body.Neptune,
  PLUTO: Astronomy.Body.Pluto,
};

/** Longitude eclíptica tropical (eclíptica verdadeira da data), geocêntrica. */
export function bodyLongitude(key: BodyKey, t: Date): number {
  if (key === 'SUN') return Astronomy.SunPosition(t).elon;
  if (key === 'MOON') return moonLongitude(t);
  return Astronomy.Ecliptic(Astronomy.GeoVector(PLANETS[key]!, t, true)).elon;
}

export interface NatalInput {
  birthUtc: Date;
  latitude: number;
  longitude: number;
  timeKnown: boolean;
  birthDate: DateISO;
  birthTz: string;
}

export function computeNatalChart(input: NatalInput): NatalChart {
  const t = input.birthUtc;
  const next = new Date(t.getTime() + 86_400_000);

  let ascendant: ZodiacPosition | null = null;
  let midheaven: ZodiacPosition | null = null;
  if (input.timeKnown) {
    const angles = computeAngles(t, input.latitude, input.longitude);
    ascendant = toZodiacPosition(angles.ascendant);
    midheaven = toZodiacPosition(angles.midheaven);
  }
  const ascIdx = ascendant ? signIndex(ascendant.longitude) : null;

  const bodies = {} as Record<BodyKey, NatalBody>;
  for (const key of BODY_KEYS) {
    const lon = bodyLongitude(key, t);
    const retrograde = key !== 'SUN' && key !== 'MOON' && signedDeg(bodyLongitude(key, next) - lon) < 0;
    bodies[key] = {
      ...toZodiacPosition(lon),
      retrograde,
      house: ascIdx === null ? null : ((signIndex(lon) - ascIdx + 12) % 12) + 1,
    };
  }

  let moonSignUncertain = false;
  if (!input.timeKnown) {
    const { start, end } = dayBoundsUtc(input.birthDate, input.birthTz);
    const lastMinute = new Date(end.getTime() - 60_000);
    moonSignUncertain = signIndex(moonLongitude(start)) !== signIndex(moonLongitude(lastMinute));
  }

  return {
    version: 1,
    computedFor: {
      birthUtc: t.toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      timeKnown: input.timeKnown,
    },
    houseSystem: input.timeKnown ? 'WHOLE_SIGN' : null,
    bodies,
    ascendant,
    midheaven,
    moonSignUncertain,
  };
}
