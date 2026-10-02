import { describe, expect, it } from 'vitest';
import type { ProgressEntry } from '@/lib/daily/progress';
import { computePeriodStats, computeYearMonthly, type DailyEntryLike } from './period';

const blank: ProgressEntry = {
  intention: null, morningBanishName: null, morningBanishDone: false, morningRitualDone: false, sleepGoalMet: false,
  wakeMood: null, wakeNote: null, stretchDone: false, workoutDone: false, waterDone: false,
  nightBanishName: null, nightBanishDone: false, nightRitualDone: false, gratitude: null, mood: null,
  reflection: null, summary: null,
};
const entry = (date: string, patch: Partial<ProgressEntry> = { waterDone: true }): DailyEntryLike => ({ ...blank, ...patch, date });

const base = { from: '2026-05-01', to: '2026-05-31', today: '2026-05-10', weeks: [] };

describe('computePeriodStats', () => {
  it('sem entradas', () => {
    const s = computePeriodStats({ ...base, entries: [] });
    expect(s).toMatchObject({
      to: '2026-05-10', daysElapsed: 10, daysTouched: 0, daysComplete: 0, currentStreak: 0, bestStreak: 0,
      avgMood: null, avgWakeMood: null,
    });
    expect(s.habits.water).toEqual({ done: 0, of: 10 });
    expect(s.weight).toEqual({ first: null, last: null, points: [] });
  });

  it('streak limitado ao período (dias de abril não contam)', () => {
    const s = computePeriodStats({
      ...base,
      entries: ['2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02'].map((d) => entry(d)),
      today: '2026-05-02',
    });
    expect(s.currentStreak).toBe(2);
    expect(s.bestStreak).toBe(2);
  });

  it('hoje vazio → streak conta até ontem', () => {
    const entries = ['2026-05-07', '2026-05-08', '2026-05-09'].map((d) => entry(d));
    expect(computePeriodStats({ ...base, entries }).currentStreak).toBe(3);
    // Um buraco antes de hoje quebra a sequência.
    const gap = ['2026-05-07', '2026-05-08'].map((d) => entry(d));
    expect(computePeriodStats({ ...base, entries: gap }).currentStreak).toBe(0);
    expect(computePeriodStats({ ...base, entries: gap }).bestStreak).toBe(2);
  });

  it('hábitos ignoram dias futuros', () => {
    const entries = [entry('2026-05-05', { stretchDone: true }), entry('2026-05-20', { stretchDone: true })];
    expect(computePeriodStats({ ...base, entries }).habits.stretch).toEqual({ done: 1, of: 10 });
  });

  it('humor médio ignora null e arredonda a 1 casa', () => {
    const entries = [
      entry('2026-05-01', { mood: 4, wakeMood: 2 }),
      entry('2026-05-02', { mood: 5 }),
      entry('2026-05-03', { mood: null, wakeMood: 3 }),
      entry('2026-05-04', { mood: 4 }),
    ];
    const s = computePeriodStats({ ...base, entries });
    expect(s.avgMood).toBe(4.3);
    expect(s.avgWakeMood).toBe(2.5);
  });

  it('peso: primeiro e último dentro do período, ordenados', () => {
    const s = computePeriodStats({
      ...base,
      today: '2026-05-31',
      entries: [],
      weeks: [
        { startDate: '2026-05-17', weightGrams: 75_800 },
        { startDate: '2026-05-03', weightGrams: 76_400 },
        { startDate: '2026-04-26', weightGrams: 77_000 },
        { startDate: '2026-05-10', weightGrams: null },
      ],
    });
    expect(s.weight.first).toBe(76_400);
    expect(s.weight.last).toBe(75_800);
    expect(s.weight.points.map((p) => p.weekStart)).toEqual(['2026-05-03', '2026-05-17']);
  });

  it('período inteiro no futuro → 0 dias decorridos', () => {
    const s = computePeriodStats({ from: '2026-06-01', to: '2026-06-30', today: '2026-05-10', entries: [], weeks: [] });
    expect(s.daysElapsed).toBe(0);
    expect(s.habits.water.of).toBe(0);
  });
});

describe('sem consentimento de bem-estar (F9)', () => {
  it('humor, sono e peso ficam de fora', () => {
    const s = computePeriodStats({
      ...base,
      entries: [entry('2026-05-02', { mood: 4, wakeMood: 3, sleepGoalMet: true, waterDone: true })],
      weeks: [{ startDate: '2026-05-03', weightGrams: 60000 }],
      wellbeing: false,
    });
    expect(s).toMatchObject({ avgMood: null, avgWakeMood: null, wellbeing: false, daysTouched: 1 });
    expect(s.habits.sleepGoal).toEqual({ done: 0, of: 0 });
    expect(s.weight.points).toEqual([]);
    expect(computeYearMonthly(2026, '2026-05-10', [entry('2026-05-02', { mood: 4 })], false)[4]!.avgMood).toBeNull();
  });
});

describe('computeYearMonthly', () => {
  it('12 meses; futuros a zero', () => {
    const months = computeYearMonthly(2026, '2026-05-10', [entry('2026-05-02', { mood: 5 }), entry('2026-01-10', { mood: 3 })]);
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ month: 1, avgMood: 3, daysTouched: 1, daysElapsed: 31 });
    expect(months[4]).toMatchObject({ month: 5, avgMood: 5, daysElapsed: 10 });
    expect(months[5]).toMatchObject({ month: 6, daysElapsed: 0, avgMood: null });
  });
});
