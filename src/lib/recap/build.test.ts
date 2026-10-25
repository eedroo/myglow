import { describe, expect, it } from 'vitest';
import type { DayLevel } from '@/lib/daily/progress';
import { HABIT_KEYS, type HabitCount, type HabitKey, type PeriodStats } from '@/lib/stats/period';
import { buildRecap, type RecapInput, type RecapSlide } from './build';
import { weekRecapPeriod } from './period';

const habits = (patch: Partial<Record<HabitKey, number>> = {}) =>
  Object.fromEntries(HABIT_KEYS.map((k) => [k, { done: patch[k] ?? 0, of: 7 }])) as Record<HabitKey, HabitCount>;

const stats = (patch: Partial<PeriodStats> = {}): PeriodStats => ({
  from: '2026-10-18', to: '2026-10-24', daysElapsed: 7, daysTouched: 3, daysComplete: 1,
  currentStreak: 2, bestStreak: 2, avgMood: 4, avgWakeMood: 3.5,
  habits: habits({ water: 3, morningRitual: 2, sleepGoal: 1 }),
  weight: { first: 60000, last: 59800, points: [{ weekStart: '2026-10-18', grams: 60000 }, { weekStart: '2026-10-25', grams: 59800 }] },
  wellbeing: true,
  ...patch,
});

const levels = (l: DayLevel[]) => l.map((level, k) => ({ date: `2026-10-${String(18 + k).padStart(2, '0')}`, level }));

const input = (patch: Partial<RecapInput> = {}): RecapInput => ({
  period: weekRecapPeriod('2026-10-18'),
  today: '2026-10-24',
  now: new Date('2026-10-25T12:00:00Z'), // domingo
  tz: 'Europe/Lisbon',
  locale: 'pt-BR',
  hasWellbeingConsent: true,
  guideAccess: 'pending',
  periodTitle: 'Semana 3 de outubro',
  intention: 'Calma',
  reflectionEmpty: true,
  stats: stats(),
  prevStats: stats({ daysTouched: 1 }),
  dayLevels: levels(['empty', 'complete', 'partial', 'empty', 'empty', 'empty', 'empty']),
  dayIntentions: {},
  glow: { earned: 50, prevEarned: 50, totalBefore: 250, totalAfter: 300 },
  grimoire: { lessons: 0, coursesCompleted: [] },
  moonEvents: [],
  skyEvents: [],
  retrogrades: [],
  ...patch,
});

const types = (s: RecapSlide[]) => s.map((x) => x.type);
const find = <T extends RecapSlide['type']>(s: RecapSlide[], t: T) => s.find((x) => x.type === t) as Extract<RecapSlide, { type: T }> | undefined;

describe('buildRecap', () => {
  it('sem consentimento: sem rest e sem peso', () => {
    const s = buildRecap(input({ hasWellbeingConsent: false }));
    expect(types(s)).not.toContain('rest');
    expect(find(s, 'body')?.weight).toBeNull();
  });

  it('com consentimento: peso e descanso', () => {
    const s = buildRecap(input());
    expect(find(s, 'body')?.weight).toEqual({ firstGrams: 60000, lastGrams: 59800, points: [60000, 59800] });
    expect(types(s)).toContain('rest');
  });

  it('hábitos todos a 0: sem rituals', () => {
    const s = buildRecap(input({ stats: stats({ habits: habits({ water: 1 }) }) }));
    expect(types(s)).not.toContain('rituals');
  });

  it('glow igual ao anterior: moreThanPrev null; maior: a diferença', () => {
    expect(find(buildRecap(input()), 'glow')?.moreThanPrev).toBeNull();
    expect(find(buildRecap(input({ glow: { earned: 80, prevEarned: 50, totalBefore: 250, totalAfter: 330 } })), 'glow')).toMatchObject({
      moreThanPrev: 30, levelBefore: 1, levelAfter: 2,
    });
  });

  it('glow 0: sem slide', () => {
    expect(types(buildRecap(input({ glow: { earned: 0, prevEarned: 20, totalBefore: 10, totalAfter: 10 } })))).not.toContain('glow');
  });

  it('dias: só diz "a mais" quando sobe', () => {
    expect(find(buildRecap(input()), 'days')?.moreThanPrev).toBe(2);
    expect(find(buildRecap(input({ prevStats: stats({ daysTouched: 5 }) })), 'days')?.moreThanPrev).toBeNull();
  });

  it('destaque: o dia complete mais recente em caso de empate', () => {
    const s = buildRecap(input({
      dayLevels: levels(['complete', 'partial', 'complete', 'partial', 'empty', 'empty', 'empty']),
      dayIntentions: { '2026-10-20': 'Foco' },
    }));
    expect(find(s, 'highlight')).toEqual({ type: 'highlight', date: '2026-10-20', intention: 'Foco' });
  });

  it('destaque: sem complete, o partial mais recente', () => {
    const s = buildRecap(input({ dayLevels: levels(['partial', 'empty', 'partial', 'empty', 'empty', 'empty', 'empty']) }));
    expect(find(s, 'highlight')?.date).toBe('2026-10-20');
  });

  it('reflectionCta: verdadeiro com reflexão vazia ao domingo, falso com reflexão escrita', () => {
    expect(find(buildRecap(input()), 'closing')?.reflectionCta).toBe(true);
    expect(find(buildRecap(input({ reflectionEmpty: false })), 'closing')?.reflectionCta).toBe(false);
  });

  it('guideAccess passa para o closing (locked, consent, pending, ready)', () => {
    expect(find(buildRecap(input({ guideAccess: 'locked' })), 'closing')).toMatchObject({ guide: 'locked', nextHref: '/week' });
    for (const guideAccess of ['consent', 'pending', 'ready'] as const) {
      expect(find(buildRecap(input({ guideAccess })), 'closing')?.guide).toBe(guideAccess);
    }
  });

  it('ordem respeitada; cover, days e closing sempre presentes', () => {
    const full = buildRecap(input({
      grimoire: { lessons: 2, coursesCompleted: [] },
      moonEvents: [{ phase: 'FULL_MOON', at: '2026-10-21T10:00:00Z', date: '2026-10-21', sign: 'ARIES' }],
    }));
    expect(types(full)).toEqual(['cover', 'days', 'glow', 'rituals', 'body', 'rest', 'grimoire', 'sky', 'highlight', 'closing']);

    const empty = buildRecap(input({
      hasWellbeingConsent: false,
      stats: stats({ daysTouched: 0, daysComplete: 0, habits: habits(), weight: { first: null, last: null, points: [] } }),
      prevStats: null,
      dayLevels: levels(['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty']),
      glow: { earned: 0, prevEarned: null, totalBefore: 0, totalAfter: 0 },
    }));
    expect(types(empty)).toEqual(['cover', 'days', 'closing']);
  });
});
