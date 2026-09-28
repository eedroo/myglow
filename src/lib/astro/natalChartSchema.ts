import { z } from 'zod';
import type { NatalChart } from '@/types/astro';
import { ZODIAC_ORDER } from './zodiac';

const sign = z.enum(ZODIAC_ORDER as [string, ...string[]]);

const position = z.object({
  longitude: z.number().min(0).lt(360),
  sign,
  degree: z.number().min(0).lt(30),
});

const body = position.extend({
  retrograde: z.boolean(),
  house: z.number().int().min(1).max(12).nullable(),
});

/** Valida o `BirthProfile.natalChart` lido da DB antes de o usar. */
export const natalChartSchema = z.object({
  version: z.literal(1),
  computedFor: z.object({
    birthUtc: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timeKnown: z.boolean(),
  }),
  houseSystem: z.literal('WHOLE_SIGN').nullable(),
  bodies: z.object({
    SUN: body, MOON: body, MERCURY: body, VENUS: body, MARS: body,
    JUPITER: body, SATURN: body, URANUS: body, NEPTUNE: body, PLUTO: body,
  }),
  ascendant: position.nullable(),
  midheaven: position.nullable(),
  moonSignUncertain: z.boolean(),
});

export function parseNatalChart(value: unknown): NatalChart | null {
  const r = natalChartSchema.safeParse(value);
  return r.success ? (r.data as NatalChart) : null;
}
