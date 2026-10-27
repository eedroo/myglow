import { describe, expect, it } from 'vitest';
import { STAGES } from './stages';
import { NEW_JOURNEY, evaluateJourney, practiceDays, progressToNext, unlockedPlanners, unlockedSections, type JourneyState } from './state';
import { entry } from './fixtures.test-utils';

const open = { intention: 'Calma', gratitude: 'Sol' };
const at = (stage: JourneyState['stage'], extra: JourneyState['extraUnlocks'] = new Set()): JourneyState => ({ stage, allUnlocked: false, extraUnlocks: extra });

describe('unlockedSections', () => {
  it('etapa 1: intenção, gratidão, humor e a semana; sem banimento', () => {
    const s = unlockedSections(NEW_JOURNEY);
    for (const k of ['intention', 'gratitude', 'mood', 'weekIntention', 'weekWeight', 'weekReflection', 'reading'] as const) expect(s.has(k), k).toBe(true);
    for (const k of ['morningBanish', 'nightBanish', 'body', 'reflection', 'weekProjects', 'monthIntention'] as const) expect(s.has(k), k).toBe(false);
  });

  it('allUnlocked → todas as secções e os planners', () => {
    const s = unlockedSections({ ...NEW_JOURNEY, allUnlocked: true });
    for (const def of STAGES) for (const k of def.sections) expect(s.has(k)).toBe(true);
    expect(s.has('yearWord')).toBe(true);
    expect([...unlockedPlanners({ ...NEW_JOURNEY, allUnlocked: true })]).toEqual(['month', 'year']);
  });

  it('planners: etapa 3 ou month-year', () => {
    expect(unlockedPlanners(at(2)).size).toBe(0);
    expect(unlockedPlanners(at(3)).size).toBe(2);
    expect(unlockedPlanners(at(1, new Set(['month-year']))).has('month')).toBe(true);
  });
});

describe('practiceDays', () => {
  it('3 dias não seguidos com intenção e gratidão → 3; só intenção não conta', () => {
    const entries = [entry('2026-10-01', open), entry('2026-10-05', open), entry('2026-10-09', open), entry('2026-10-10', { intention: 'x' })];
    expect(practiceDays(STAGES[0]!, entries)).toBe(3);
  });

  it('etapa 5 não tem requisito', () => {
    expect(practiceDays(STAGES[4]!, [entry('2026-10-01', open)])).toBe(0);
  });
});

describe('evaluateJourney', () => {
  it('etapa 1 com 3 dias → etapa 2 e stage-2', () => {
    const r = evaluateJourney({ state: NEW_JOURNEY, entries: ['2026-10-01', '2026-10-03', '2026-10-07'].map((d) => entry(d, open)), hasWeekReflection: false });
    expect(r.state.stage).toBe(2);
    expect(r.newUnlocks).toEqual(['stage-2']);
  });

  it('dados que cumprem várias etapas → sobe só uma', () => {
    const all = { ...open, morningBanishDone: true, morningRitualDone: true, waterDone: true };
    const r = evaluateJourney({ state: NEW_JOURNEY, entries: ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => entry(d, all)), hasWeekReflection: false });
    expect(r.state.stage).toBe(2);
    expect(r.newUnlocks).toEqual(['stage-2']);
  });

  it('com 2 dias fica na mesma', () => {
    const r = evaluateJourney({ state: NEW_JOURNEY, entries: [entry('2026-10-01', open), entry('2026-10-02', open)], hasWeekReflection: false });
    expect(r).toEqual({ state: NEW_JOURNEY, newUnlocks: [] });
  });

  it('month-year com reflexão da semana na etapa 1', () => {
    const r = evaluateJourney({ state: NEW_JOURNEY, entries: [], hasWeekReflection: true });
    expect(r.state.stage).toBe(1);
    expect(r.newUnlocks).toEqual(['month-year']);
    expect(unlockedPlanners(r.state).has('year')).toBe(true);
  });

  it('chegar à etapa 3 também abre month-year (uma vez)', () => {
    const r = evaluateJourney({ state: at(2), entries: ['2026-10-01', '2026-10-02', '2026-10-04'].map((d) => entry(d, { nightBanishDone: true })), hasWeekReflection: false });
    expect(r.newUnlocks).toEqual(['stage-3', 'month-year']);
    expect(evaluateJourney({ state: r.state, entries: [], hasWeekReflection: true }).newUnlocks).toEqual([]);
  });

  it('allUnlocked não muda nada', () => {
    const s = { ...NEW_JOURNEY, allUnlocked: true };
    expect(evaluateJourney({ state: s, entries: [entry('2026-10-01', open)], hasWeekReflection: true }).newUnlocks).toEqual([]);
  });
});

describe('progressToNext', () => {
  it('etapa 2 com 1 dia de banimento → 1 de 3', () => {
    expect(progressToNext(at(2), [entry('2026-10-01', { morningBanishDone: true })])).toEqual({ stage: 3, done: 1, of: 3 });
  });

  it('null na etapa 5 e com tudo desbloqueado', () => {
    expect(progressToNext(at(5), [])).toBeNull();
    expect(progressToNext({ ...NEW_JOURNEY, allUnlocked: true }, [])).toBeNull();
  });
});
