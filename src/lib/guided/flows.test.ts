import { describe, expect, it } from 'vitest';
import { buildFlow, firstIncompleteStep, flowFromRoute, isStepDone, routeSegment } from './flows';

const all = { hasWellbeingConsent: true, hasBodyPro: true };

describe('buildFlow', () => {
  it('manhã com tudo disponível', () => {
    expect(buildFlow('DAY_MORNING', all).map((s) => s.id)).toEqual(['intro', 'reading', 'intention', 'morningBanish', 'morningRitual', 'sleep', 'wakeMood', 'closing']);
  });
  it('sem consentimento: sem sono nem como acordei', () => {
    const ids = buildFlow('DAY_MORNING', { hasWellbeingConsent: false, hasBodyPro: false }).map((s) => s.id);
    expect(ids).not.toContain('sleep');
    expect(ids).not.toContain('wakeMood');
    expect(buildFlow('DAY_NIGHT', { hasWellbeingConsent: false, hasBodyPro: false }).map((s) => s.id)).not.toContain('mood');
  });
  it('semana: 5 áreas opcionais', () => {
    const areas = buildFlow('WEEK_PLAN', all).filter((s) => s.section === 'weekProjects');
    expect(areas).toHaveLength(5);
    expect(areas.every((s) => s.optional && s.kind === 'text')).toBe(true);
  });
  it('ano começa pela palavra', () => {
    expect(buildFlow('YEAR_PLAN', all)[1]!.kind).toBe('word');
  });
});

describe('progresso no fluxo', () => {
  const steps = buildFlow('DAY_MORNING', all);
  it('intenção preenchida → abre no banimento', () => {
    expect(steps[firstIncompleteStep(steps, { intention: 'Calma' })]!.id).toBe('morningBanish');
  });
  it('tudo preenchido → closing', () => {
    const v = { intention: 'x', morningBanishName: 'medo', morningBanishDone: true, morningRitualDone: true, sleepGoalMet: true, wakeMood: 4 };
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
