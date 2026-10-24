import { addDays, compareDates, type DateISO } from '@/lib/dates';

/** Métricas de produto (F12). Puras: os dados entram como argumentos. */
export interface ActiveRow {
  userId: string;
  day: DateISO;
}

export interface SignupRow {
  userId: string;
  createdDay: DateISO;
}

/** Pessoas distintas activas num intervalo de dias [from, to]. */
export function distinctActive(rows: ActiveRow[], from: DateISO, to: DateISO): number {
  const ids = new Set<string>();
  for (const r of rows) if (compareDates(r.day, from) >= 0 && compareDates(r.day, to) <= 0) ids.add(r.userId);
  return ids.size;
}

/** DAU (hoje), WAU (7 dias com hoje), MAU (30 dias com hoje) e stickiness = DAU/MAU (0 se MAU = 0). */
export function activeUsers(rows: ActiveRow[], today: DateISO): { dau: number; wau: number; mau: number; stickiness: number } {
  const dau = distinctActive(rows, today, today);
  const wau = distinctActive(rows, addDays(today, -6), today);
  const mau = distinctActive(rows, addDays(today, -29), today);
  return { dau, wau, mau, stickiness: mau ? dau / mau : 0 };
}

/** Activos por dia nos últimos `n` dias (do mais antigo para hoje), para as barras do admin. */
export function activeByDay(rows: ActiveRow[], today: DateISO, n: number): { day: DateISO; count: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1);
    return { day, count: distinctActive(rows, day, day) };
  });
}
