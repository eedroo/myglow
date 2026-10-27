import { describe, expect, it } from 'vitest';
import { computeDayProgress, type ProgressEntry } from './progress';
import { NEW_JOURNEY, unlockedSections } from '@/lib/journey/state';

const blank: ProgressEntry = {
  intention: null, morningBanishName: null, morningBanishDone: false, morningRitualDone: false, sleepGoalMet: false,
  wakeMood: null, wakeNote: null, stretchDone: false, workoutDone: false, waterDone: false,
  nightBanishName: null, nightBanishDone: false, nightRitualDone: false, gratitude: null, mood: null,
  reflection: null, summary: null,
};

const full: ProgressEntry = {
  ...blank,
  intention: 'Calma', morningBanishDone: true, morningRitualDone: true, wakeMood: 4,
  stretchDone: true, workoutDone: true, waterDone: true,
  nightBanishDone: true, nightRitualDone: true, gratitude: 'Sol', mood: 5, reflection: 'Aprendi',
};

describe('computeDayProgress', () => {
  it('sem entrada → empty', () => {
    expect(computeDayProgress('2026-05-06', null)).toMatchObject({ hasEntry: false, level: 'empty', bodyChecks: 0 });
  });

  it('entrada sem nada preenchido → empty', () => {
    expect(computeDayProgress('2026-05-06', blank).level).toBe('empty');
  });

  it('só água → partial com 1 check de corpo', () => {
    const p = computeDayProgress('2026-05-06', { ...blank, waterDone: true });
    expect(p).toMatchObject({ level: 'partial', bodyChecks: 1, body: false, morning: false, night: false });
  });

  it('tudo excepto sono e resumo → complete', () => {
    const p = computeDayProgress('2026-05-06', full);
    expect(p).toMatchObject({ morning: true, body: true, night: true, bodyChecks: 3, level: 'complete' });
  });

  it('sem consentimento de bem-estar: manhã = intenção + banimento + ritual; noite sem humor', () => {
    const noWellbeing = { ...full, wakeMood: null, mood: null };
    expect(computeDayProgress('2026-05-06', noWellbeing).level).toBe('partial');
    expect(computeDayProgress('2026-05-06', noWellbeing, { wellbeing: false })).toMatchObject({
      morning: true, night: true, level: 'complete',
    });
    expect(computeDayProgress('2026-05-06', { ...noWellbeing, intention: null }, { wellbeing: false }).morning).toBe(false);
  });

  it('texto só com espaços não conta', () => {
    const p = computeDayProgress('2026-05-06', { ...full, intention: '   ' });
    expect(p.morning).toBe(false);
    expect(p.level).toBe('partial');
    expect(computeDayProgress('2026-05-06', { ...blank, reflection: '  \n ' }).level).toBe('empty');
  });

  it('sono e resumo sozinhos tornam o dia parcial mas nunca completo', () => {
    expect(computeDayProgress('2026-05-06', { ...blank, sleepGoalMet: true, summary: 'ok' }).level).toBe('partial');
  });
});

describe('computeDayProgress com a jornada (F19)', () => {
  const stage1 = unlockedSections(NEW_JOURNEY);
  const stage2 = unlockedSections({ ...NEW_JOURNEY, stage: 2 });

  it('sem available → igual ao actual', () => {
    expect(computeDayProgress('2026-05-06', full)).toEqual(computeDayProgress('2026-05-06', full, {}));
    expect(computeDayProgress('2026-05-06', full).applicable).toEqual({ morning: true, body: true, night: true });
  });

  it('etapa 1 com intenção, gratidão e humor → complete, corpo não aplicável', () => {
    const p = computeDayProgress('2026-05-06', { ...blank, intention: 'Calma', gratitude: 'Sol', mood: 4 }, { available: stage1 });
    expect(p).toMatchObject({ morning: true, night: true, body: false, level: 'complete', applicable: { morning: true, body: false, night: true } });
  });

  it('etapa 1 sem humor → noite incompleta', () => {
    expect(computeDayProgress('2026-05-06', { ...blank, intention: 'Calma', gratitude: 'Sol' }, { available: stage1 }).level).toBe('partial');
  });

  it('etapa 2 sem banimento → manhã incompleta', () => {
    const p = computeDayProgress('2026-05-06', { ...blank, intention: 'Calma', gratitude: 'Sol', mood: 4 }, { available: stage2 });
    expect(p).toMatchObject({ morning: false, night: false, level: 'partial' });
  });

  it('sem entrada também diz o que é aplicável', () => {
    expect(computeDayProgress('2026-05-06', null, { available: stage1 }).applicable.body).toBe(false);
  });
});
