import * as Astronomy from 'astronomy-engine';
import type { DailySky } from '@/types/astro';
import { localNoonUtc, type DateISO } from '@/lib/dates';
import { getDailyMoon } from './moon';
import { toZodiacPosition } from './zodiac';

/** Céu do dia local (puro, sem DB): Sol ao meio-dia local e Lua do dia. */
export function getDailySky(date: DateISO, tz: string): DailySky {
  const noon = localNoonUtc(date, tz);
  return {
    date,
    timezone: tz,
    sun: toZodiacPosition(Astronomy.SunPosition(noon).elon),
    moon: getDailyMoon(date, tz),
  };
}
