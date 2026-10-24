import { addDays, compareDates, type DateISO } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';
import type { ActiveRow, SignupRow } from './active';

export interface CohortRetention {
  cohortStart: DateISO; // domingo
  size: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

/**
 * Coortes semanais (domingo) das últimas `weeks` semanas, a acabar na semana de hoje. dN = % da coorte activa
 * exactamente no dia N depois do registo; `null` se o dia N ainda não chegou para toda a coorte (último registo
 * possível: sábado da semana).
 */
export function retention(signups: SignupRow[], rows: ActiveRow[], today: DateISO, weeks: number): CohortRetention[] {
  const active = new Set(rows.map((r) => `${r.userId}|${r.day}`));
  const thisWeek = weekStartOf(today);
  return Array.from({ length: weeks }, (_, i) => {
    const cohortStart = addDays(thisWeek, -7 * (weeks - 1 - i));
    const cohortEnd = addDays(cohortStart, 6);
    const members = signups.filter((s) => compareDates(s.createdDay, cohortStart) >= 0 && compareDates(s.createdDay, cohortEnd) <= 0);
    const rate = (n: number): number | null => {
      if (!members.length || compareDates(addDays(cohortEnd, n), today) > 0) return null;
      const back = members.filter((m) => active.has(`${m.userId}|${addDays(m.createdDay, n)}`)).length;
      return Math.round((100 * back) / members.length);
    };
    return { cohortStart, size: members.length, d1: rate(1), d7: rate(7), d30: rate(30) };
  });
}
