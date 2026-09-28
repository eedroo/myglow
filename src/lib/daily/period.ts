import { DateTime } from 'luxon';
import type { DayPeriod } from '@/types/daily';

/** Período do dia no fuso do utilizador: manhã até 12:00, corpo 12:00–18:00, noite depois. */
export function getDayPeriod(now: Date, tz: string): DayPeriod {
  const hour = DateTime.fromJSDate(now, { zone: tz }).hour;
  if (hour < 12) return 'morning';
  if (hour < 18) return 'body';
  return 'night';
}
