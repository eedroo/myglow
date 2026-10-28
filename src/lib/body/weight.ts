import { DateTime } from 'luxon';
import { addDays, compareDates, type DateISO } from '@/lib/dates';
import { weekDays, weekStartOf } from '@/lib/weeks';

/**
 * Peso diário (F17). Puro. Um registo por dia; o número principal é a média da semana (domingo a sábado).
 * Linguagem neutra: "acima" e "abaixo" são relativos ao ritmo que a pessoa escolheu, nunca bom ou mau.
 */

export interface WeightPoint {
  date: DateISO;
  grams: number;
}

export type GoalDirection = 'GAIN' | 'MAINTAIN' | 'LOSE';

export interface GoalInput {
  direction: GoalDirection;
  weeklyRateGrams: number;
  targetGrams: number | null;
}

const mean = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Média entre `from` e `to` (inclusive); null sem registos. */
export function rangeAverage(points: WeightPoint[], from: DateISO, to: DateISO): number | null {
  return mean(points.filter((p) => compareDates(p.date, from) >= 0 && compareDates(p.date, to) <= 0).map((p) => p.grams));
}

/** Média da semana que começa em `weekStart` (domingo). */
export function weekAverage(points: WeightPoint[], weekStart: DateISO): number | null {
  const days = weekDays(weekStartOf(weekStart));
  return rangeAverage(points, days[0]!, days[6]!);
}

/** Médias semanais de todas as semanas que tocam [from, to]. */
export function weeklyAverages(points: WeightPoint[], from: DateISO, to: DateISO): { weekStart: DateISO; avgGrams: number | null; count: number }[] {
  const out: { weekStart: DateISO; avgGrams: number | null; count: number }[] = [];
  for (let w = weekStartOf(from); compareDates(w, to) <= 0; w = addDays(w, 7)) {
    const end = addDays(w, 6);
    const inWeek = points.filter((p) => compareDates(p.date, w) >= 0 && compareDates(p.date, end) <= 0);
    out.push({ weekStart: w, avgGrams: mean(inWeek.map((p) => p.grams)), count: inWeek.length });
  }
  return out;
}

/** Tendência: em cada dia com registo, a média dos registos dos últimos `days` dias de calendário. */
export function rollingAverage(points: WeightPoint[], days = 7): WeightPoint[] {
  const sorted = [...points].sort((a, b) => compareDates(a.date, b.date));
  return sorted.map((p) => ({ date: p.date, grams: rangeAverage(sorted, addDays(p.date, -(days - 1)), p.date)! }));
}

export type WeightRange = 'W' | 'M' | '6M' | 'Y';

/** W = últimos 7 dias, M = último mês, 6M = últimos 6 meses, Y = último ano; até hoje. */
export function rangeBounds(range: WeightRange, today: DateISO): { from: DateISO; to: DateISO } {
  if (range === 'W') return { from: DateTime.fromISO(today, { zone: 'utc' }).minus({ days: 6 }).toISODate() as DateISO, to: today };
  const months = range === 'M' ? 1 : range === '6M' ? 6 : 12;
  const from = DateTime.fromISO(today, { zone: 'utc' }).minus({ months }).plus({ days: 1 }).toISODate() as DateISO;
  return { from, to: today };
}

export interface GoalStatus {
  status: 'on-track' | 'above' | 'below' | 'not-enough-data';
  weeklyDeltaGrams: number | null;
  expectedGrams: number;
  toTargetGrams: number | null;
  weeksToTarget: number | null;
}

export function expectedWeeklyGrams(goal: Pick<GoalInput, 'direction' | 'weeklyRateGrams'>): number {
  return goal.direction === 'GAIN' ? goal.weeklyRateGrams : goal.direction === 'LOSE' ? -goal.weeklyRateGrams : 0;
}

/** Tolerância: ± max(100 g, 50 % do ritmo); manter: ± 250 g. */
export function goalTolerance(goal: Pick<GoalInput, 'direction' | 'weeklyRateGrams'>): number {
  return goal.direction === 'MAINTAIN' ? 250 : Math.max(100, Math.round(goal.weeklyRateGrams / 2));
}

export function goalStatus(goal: GoalInput, thisWeekAvg: number | null, lastWeekAvg: number | null): GoalStatus {
  const expectedGrams = expectedWeeklyGrams(goal);
  const toTargetGrams = goal.targetGrams != null && thisWeekAvg != null ? goal.targetGrams - thisWeekAvg : null;
  // Semanas até ao alvo ao ritmo escolhido, só quando o alvo está na direcção do objectivo.
  const weeksToTarget =
    toTargetGrams != null && expectedGrams !== 0 && Math.sign(toTargetGrams) === Math.sign(expectedGrams)
      ? Math.ceil(Math.abs(toTargetGrams) / Math.abs(expectedGrams))
      : toTargetGrams === 0
        ? 0
        : null;
  if (thisWeekAvg == null || lastWeekAvg == null) {
    return { status: 'not-enough-data', weeklyDeltaGrams: null, expectedGrams, toTargetGrams, weeksToTarget };
  }
  const delta = thisWeekAvg - lastWeekAvg;
  const tol = goalTolerance(goal);
  const status = Math.abs(delta - expectedGrams) <= tol ? 'on-track' : delta > expectedGrams ? 'above' : 'below';
  return { status, weeklyDeltaGrams: delta, expectedGrams, toTargetGrams, weeksToTarget };
}

/** Opções de ritmo (g/semana) mostradas na UI e aceites pela action. */
export const GOAL_RATES = {
  GAIN: [100, 250, 500],
  LOSE: [250, 500, 750],
  MAINTAIN: [0],
} as const;

export const WEIGHT_LIMITS = { minGrams: 30_000, maxGrams: 300_000, maxDaysBack: 365 } as const;
