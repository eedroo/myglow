import { describe, expect, it } from 'vitest';
import { mapExistingUser } from './map';
import { entry } from './fixtures.test-utils';

describe('mapExistingUser', () => {
  it('sem registos → etapa 1', () => {
    expect(mapExistingUser([], [])).toEqual({ stage: 1, unlocks: [] });
  });

  it('só intenção → etapa 1', () => {
    expect(mapExistingUser([entry('2026-01-01', { intention: 'x' })], []).stage).toBe(1);
  });

  it('usou ritual uma vez e nunca banimento → etapa 3 (banimento também aberto)', () => {
    const r = mapExistingUser([entry('2026-01-01', { morningRitualDone: true })], []);
    expect(r.stage).toBe(3);
    expect(r.unlocks).toEqual(['stage-2', 'stage-3', 'month-year']);
  });

  it('usou reflexão → etapa 5', () => {
    expect(mapExistingUser([entry('2026-01-01', { reflection: 'Aprendi' })], []).stage).toBe(5);
  });

  it('áreas da semana contam como etapa 3', () => {
    expect(mapExistingUser([], [{ reflection: null, hasProjects: true }]).stage).toBe(3);
  });

  it('Week.reflection → month-year', () => {
    expect(mapExistingUser([], [{ reflection: 'Uma semana boa', hasProjects: false }])).toEqual({ stage: 1, unlocks: ['month-year'] });
  });

  it('Mês ou Ano preenchido → month-year', () => {
    expect(mapExistingUser([], [], { hasMonthOrYear: true }).unlocks).toEqual(['month-year']);
  });
});
