import { DateTime } from 'luxon';
import type { DateISO } from '@/lib/dates';

/** Idade mínima para usar a MYGLOW. */
export const MIN_AGE = 16;

/** Já fez `minAge` anos em `today`? (29 de Fevereiro faz anos a 28 em anos não bissextos.) Puro. */
export function isOldEnough(birthDate: DateISO, today: DateISO, minAge = MIN_AGE): boolean {
  const birthday = DateTime.fromISO(birthDate, { zone: 'UTC' }).plus({ years: minAge });
  return birthday.toISODate()! <= today;
}
