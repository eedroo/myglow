import { describe, expect, it } from 'vitest';
import { buildFlow, firstIncompleteStep, flowFromRoute, isStepDone, routeSegment } from './flows';
import { NEW_JOURNEY, unlockedSections } from '@/lib/journey/state';

const all = { hasWellbeingConsent: true, hasBodyPro: true };

describe('buildFlow', () => {
  it('manhã com tudo disponível', () => {
    expect(buildFlow('DAY_MORNING', all).map((s) => s.id)).toEqual(['intro', 'reading', 'intention', 'morningBanish', 'morningRitual', 'sleep', 'wakeMood', 'dailyWeight', 'closing']);
  });
  it('peso do dia no fim da manhã só com o Foco no corpo e o consentimento', () => {
    expect(buildFlow('DAY_MORNING', { ...all, hasBodyPro: false }).map((s) => s.id)).not.toContain('dailyWeight');
    expect(buildFlow('DAY_MORNING', { hasWellbeingConsent: false, hasBodyPro: true }).map((s) => s.id)).not.toContain('dailyWeight');
  });
  it('sem consentimento: sem sono nem como acordei', () => {
    const ids = buildFlow('DAY_MORNING', { hasWellbeingConsent: false, hasBodyPro: false }).map((s) => s.id);
    expect(ids).not.toContain('sleep');
    expect(ids).not.toContain('wakeMood');
    expect(buildFlow('DAY_NIGHT', { hasWellbeingConsent: false, hasBodyPro: false }).map((s) => s.id)).not.toContain('mood');
  });
  it('leitura do dia à noite: o fecho começa por ela só quando ficou para a noite', () => {
    expect(buildFlow('DAY_NIGHT', all)[1]!.id).toBe('nightBanish');
    expect(buildFlow('DAY_NIGHT', { ...all, readingAtNight: true })[1]!.id).toBe('nightReading');
  });
  it('semana: 5 áreas opcionais', () => {
    const areas = buildFlow('WEEK_PLAN', all).filter((s) => s.section === 'weekProjects');
    expect(areas).toHaveLength(5);
    expect(areas.every((s) => s.optional && s.kind === 'text')).toBe(true);
  });
  it('planear começa pela leitura do período; o ano segue com a palavra', () => {
    for (const f of ['WEEK_PLAN', 'MONTH_PLAN', 'YEAR_PLAN'] as const) expect(buildFlow(f, all)[1]!.id).toBe('periodReading');
    expect(buildFlow('YEAR_PLAN', all)[2]!.kind).toBe('word');
    expect(buildFlow('WEEK_CLOSE', all).map((s) => s.id)).not.toContain('periodReading');
  });
});

describe('progresso no fluxo', () => {
  const steps = buildFlow('DAY_MORNING', all);
  it('intenção preenchida → abre no banimento', () => {
    expect(steps[firstIncompleteStep(steps, { intention: 'Calma' })]!.id).toBe('morningBanish');
  });
  it('tudo preenchido → closing', () => {
    const v = { intention: 'x', morningBanishName: 'medo', morningBanishDone: true, morningRitualDone: true, sleepGoalMet: true, wakeMood: 4, dailyWeightGrams: 61200 };
    expect(steps[firstIncompleteStep(steps, v)]!.id).toBe('closing');
  });
  it('banimento com nome mas sem "feito" não está feito', () => {
    const banish = steps.find((s) => s.id === 'morningBanish')!;
    expect(isStepDone(banish, { morningBanishName: 'medo', morningBanishDone: false })).toBe(false);
    expect(isStepDone(banish, { morningBanishName: 'medo', morningBanishDone: true })).toBe(true);
  });
  it('rotas', () => {
    expect(flowFromRoute('day', 'night')).toBe('DAY_NIGHT');
    expect(flowFromRoute('week', 'morning')).toBeNull();
    expect(routeSegment('MONTH_CLOSE')).toBe('close');
  });
});

describe('buildFlow com a jornada (F19)', () => {
  it('etapa 1: manhã só com leitura e intenção; semana sem áreas', () => {
    const unlocked = unlockedSections(NEW_JOURNEY);
    expect(buildFlow('DAY_MORNING', { ...all, unlocked }).map((s) => s.id)).toEqual(['intro', 'reading', 'intention', 'dailyWeight', 'closing']);
    expect(buildFlow('DAY_MORNING', { ...all, hasBodyPro: false, unlocked }).map((s) => s.id)).toEqual(['intro', 'reading', 'intention', 'closing']);
    expect(buildFlow('WEEK_PLAN', { ...all, unlocked }).some((s) => s.section === 'weekProjects')).toBe(false);
  });
});
