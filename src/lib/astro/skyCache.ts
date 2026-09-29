import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Hemisphere } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import { getRetrogradePeriods, getSkyEvents } from './skyEvents';

/**
 * Versões com cache do céu do grimório (o resultado é determinístico: nunca expira).
 * Os componentes usam sempre estas.
 */
export const getCachedSkyEvents = unstable_cache(
  async (from: DateISO, to: DateISO, tz: string, hemisphere: Hemisphere) => getSkyEvents(from, to, tz, hemisphere),
  ['sky-events-v1'],
  { revalidate: false },
);

export const getCachedRetrogradePeriods = unstable_cache(
  async (from: DateISO, to: DateISO, tz: string) => getRetrogradePeriods(from, to, tz),
  ['retrograde-periods-v1'],
  { revalidate: false },
);
