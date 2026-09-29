import { addDays, compareDates, type DateISO } from '@/lib/dates';
import { monthRange } from '@/lib/weeks';
import { computeDayProgress, type ProgressEntry } from '@/lib/daily/progress';

/** Entrada do diário com a data já em `DateISO`. */
export type DailyEntryLike = ProgressEntry & { date: DateISO };

export interface HabitCount {
  done: number;
  of: number; // dias decorridos (sem futuro)
}

export type HabitKey = 'morningRitual' | 'nightRitual' | 'morningBanish' | 'nightBanish' | 'sleepGoal' | 'stretch' | 'workout' | 'water';

export const HABIT_KEYS: HabitKey[] = [
  'morningRitual', 'nightRitual', 'morningBanish', 'nightBanish', 'sleepGoal', 'stretch', 'workout', 'water',
];

const HABIT_FIELD: Record<HabitKey, keyof ProgressEntry> = {
  morningRitual: 'morningRitualDone',
  nightRitual: 'nightRitualDone',
  morningBanish: 'morningBanishDone',
  nightBanish: 'nightBanishDone',
  sleepGoal: 'sleepGoalMet',
  stretch: 'stretchDone',
  workout: 'workoutDone',
  water: 'waterDone',
};

export interface PeriodStats {
  from: DateISO;
  to: DateISO; // limitado a hoje
  daysElapsed: number;
  daysTouched: number;
  daysComplete: number;
  currentStreak: number; // dias seguidos com nível ≥ parcial; se hoje está vazio, termina ontem
  bestStreak: number;
  avgMood: number | null; // 1 casa decimal
  avgWakeMood: number | null;
  habits: Record<HabitKey, HabitCount>;
  weight: { first: number | null; last: number | null; points: { weekStart: DateISO; grams: number }[] };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function computePeriodStats(i: {
  from: DateISO;
  to: DateISO;
  today: DateISO;
  entries: DailyEntryLike[];
  weeks: { startDate: DateISO; weightGrams: number | null }[];
}): PeriodStats {
  const to = compareDates(i.to, i.today) > 0 ? i.today : i.to;
  const byDate = new Map(i.entries.map((e) => [e.date, e]));

  const days: DateISO[] = [];
  for (let d = i.from; compareDates(d, to) <= 0; d = addDays(d, 1)) days.push(d);

  const levels = days.map((d) => computeDayProgress(d, byDate.get(d) ?? null).level);
  const active = levels.map((l) => l !== 'empty');

  let bestStreak = 0;
  let run = 0;
  for (const a of active) {
    run = a ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  let end = active.length - 1;
  // Hoje ainda vazio não quebra a sequência: conta até ontem.
  if (end >= 0 && days[end] === i.today && !active[end]) end--;
  let currentStreak = 0;
  for (let k = end; k >= 0 && active[k]; k--) currentStreak++;

  const inPeriod = days.map((d) => byDate.get(d)).filter((e): e is DailyEntryLike => e !== undefined);

  const habits = Object.fromEntries(
    HABIT_KEYS.map((h) => [h, { done: inPeriod.filter((e) => e[HABIT_FIELD[h]] === true).length, of: days.length }]),
  ) as Record<HabitKey, HabitCount>;

  const points = i.weeks
    .filter((w) => w.weightGrams !== null && compareDates(w.startDate, i.from) >= 0 && compareDates(w.startDate, to) <= 0)
    .sort((a, b) => compareDates(a.startDate, b.startDate))
    .map((w) => ({ weekStart: w.startDate, grams: w.weightGrams! }));

  return {
    from: i.from,
    to,
    daysElapsed: days.length,
    daysTouched: levels.filter((l) => l !== 'empty').length,
    daysComplete: levels.filter((l) => l === 'complete').length,
    currentStreak,
    bestStreak,
    avgMood: mean(inPeriod.map((e) => e.mood).filter((m): m is number => m !== null)),
    avgWakeMood: mean(inPeriod.map((e) => e.wakeMood).filter((m): m is number => m !== null)),
    habits,
    weight: { first: points[0]?.grams ?? null, last: points[points.length - 1]?.grams ?? null, points },
  };
}

export interface MonthlyMood {
  month: number;
  avgMood: number | null;
  daysTouched: number;
  daysComplete: number;
  daysElapsed: number;
}

/** Resumo por mês de um ano (humor médio e dias registados), para a vista anual. */
export function computeYearMonthly(year: number, today: DateISO, entries: DailyEntryLike[]): MonthlyMood[] {
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const { from, to } = monthRange(year, month);
    if (compareDates(from, today) > 0) {
      return { month, avgMood: null, daysTouched: 0, daysComplete: 0, daysElapsed: 0 };
    }
    const s = computePeriodStats({
      from,
      to,
      today,
      entries: entries.filter((e) => e.date >= from && e.date <= to),
      weeks: [],
    });
    return { month, avgMood: s.avgMood, daysTouched: s.daysTouched, daysComplete: s.daysComplete, daysElapsed: s.daysElapsed };
  });
}
