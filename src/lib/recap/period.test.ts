import { describe, expect, it } from 'vitest';
import { dueRecap, isWorthShowing, monthRecapPeriod, weekRecapPeriod } from './period';

const base = { accountCreatedDay: '2026-01-01', seen: [], blocked: false };

describe('períodos', () => {
  it('semana de domingo a sábado, com a anterior', () => {
    expect(weekRecapPeriod('2026-10-18')).toEqual({
      kind: 'WEEK', key: '2026-10-18', from: '2026-10-18', to: '2026-10-24',
      prev: { from: '2026-10-11', to: '2026-10-17' },
    });
  });

  it('lança se a semana não começar ao domingo', () => {
    expect(() => weekRecapPeriod('2026-10-19')).toThrow();
  });

  it('mês inteiro, com setembro como anterior', () => {
    expect(monthRecapPeriod('2026-10')).toEqual({
      kind: 'MONTH', key: '2026-10', from: '2026-10-01', to: '2026-10-31',
      prev: { from: '2026-09-01', to: '2026-09-30' },
    });
  });
});

describe('dueRecap', () => {
  it('domingo abre a semana anterior', () => {
    expect(dueRecap({ ...base, today: '2026-10-25' })?.key).toBe('2026-10-18');
  });

  it('quarta ainda abre', () => {
    expect(dueRecap({ ...base, today: '2026-10-28' })).toMatchObject({ kind: 'WEEK', key: '2026-10-18' });
  });

  it('quinta já não abre', () => {
    expect(dueRecap({ ...base, today: '2026-10-29' })).toBeNull();
  });

  it('semana já vista', () => {
    expect(dueRecap({ ...base, today: '2026-10-25', seen: [{ kind: 'WEEK', key: '2026-10-18' }] })).toBeNull();
  });

  it('bloqueada pelo guia ou por um diálogo', () => {
    expect(dueRecap({ ...base, today: '2026-10-25', blocked: true })).toBeNull();
  });

  it('conta criada depois do fim do período', () => {
    expect(dueRecap({ ...base, today: '2026-10-28', accountCreatedDay: '2026-10-26' })).toBeNull();
  });

  it('dia 1 a um domingo: só a mensal', () => {
    expect(dueRecap({ ...base, today: '2026-11-01' })).toMatchObject({ kind: 'MONTH', key: '2026-10' });
  });
});

describe('isWorthShowing', () => {
  it('pelo menos 2 dias registados', () => {
    expect(isWorthShowing(1)).toBe(false);
    expect(isWorthShowing(2)).toBe(true);
  });
});
