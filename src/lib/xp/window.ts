import type { XpSource } from '@prisma/client';
import { DateTime } from 'luxon';
import type { DateISO } from '@/lib/dates';
import { XP_POINTS, isWindowOpen, xpWindow, type WindowedSource } from './rules';

/** Estado da janela de Glow de uma fonte para mostrar ao utilizador. Puro. */
export type WindowPhase = 'earned' | 'open' | 'upcoming' | 'closed';

export interface WindowState {
  source: WindowedSource;
  phase: WindowPhase;
  points: number;
  /** Primeiro dia local da janela. */
  from: DateISO;
  /** Último dia local da janela (inclusive). */
  until: DateISO;
}

export function windowState(
  source: WindowedSource,
  periodStart: DateISO,
  tz: string,
  now: Date,
  earned: XpSource[],
): WindowState {
  const w = xpWindow(source, periodStart, tz);
  const from = DateTime.fromJSDate(w.opens, { zone: tz }).toISODate() as DateISO;
  const until = DateTime.fromJSDate(w.closes, { zone: tz }).minus({ days: 1 }).toISODate() as DateISO;
  const phase: WindowPhase = earned.includes(source)
    ? 'earned'
    : isWindowOpen(w, now)
      ? 'open'
      : now < w.opens
        ? 'upcoming'
        : 'closed';
  return { source, phase, points: XP_POINTS[source], from, until };
}
