import { describe, expect, it } from 'vitest';
import type { DayProgress } from '@/lib/daily/progress';
import { suggestDayFlow, suggestPeriodFlow } from './suggest';

const prefs = { morningTime: '08:00', bodyTime: '13:00', nightTime: '21:00' };
const progress = (p: Partial<DayProgress>): DayProgress => ({ date: '2026-10-28', hasEntry: true, morning: false, body: false, bodyChecks: 0, night: false, level: 'partial', applicable: { morning: true, body: true, night: true }, ...p });

describe('suggestDayFlow', () => {
  it('09:00 com a manhã incompleta → manhã', () => {
    expect(suggestDayFlow({ localTime: '09:00', prefs, progress: progress({}) })).toBe('DAY_MORNING');
  });
  it('14:00 com o corpo completo e a manhã incompleta → manhã', () => {
    expect(suggestDayFlow({ localTime: '14:00', prefs, progress: progress({ body: true, bodyChecks: 3 }) })).toBe('DAY_MORNING');
  });
  it('14:00 com o corpo por fazer → corpo', () => {
    expect(suggestDayFlow({ localTime: '14:00', prefs, progress: progress({ morning: true }) })).toBe('DAY_BODY');
  });
  it('22:00 com a noite completa → nada', () => {
    expect(suggestDayFlow({ localTime: '22:00', prefs, progress: progress({ night: true }) })).toBeNull();
  });
});

describe('suggestPeriodFlow', () => {
  const tz = 'Europe/Lisbon';
  it('sábado com a reflexão vazia → fechar a semana', () => {
    expect(
      suggestPeriodFlow({ kind: 'WEEK', periodStart: '2026-10-25', today: '2026-10-31', now: new Date('2026-10-31T12:00:00Z'), tz, planFilled: true, reflectionFilled: false }),
    ).toBe('WEEK_CLOSE');
  });
  it('domingo com a intenção vazia (reflexão anterior já escrita) → planear', () => {
    expect(
      suggestPeriodFlow({ kind: 'WEEK', periodStart: '2026-11-01', today: '2026-11-01', now: new Date('2026-11-01T10:00:00Z'), tz, planFilled: false, reflectionFilled: false }),
    ).toBe('WEEK_PLAN');
  });
  it('fora das janelas → nada', () => {
    expect(
      suggestPeriodFlow({ kind: 'WEEK', periodStart: '2026-11-01', today: '2026-11-04', now: new Date('2026-11-04T10:00:00Z'), tz, planFilled: false, reflectionFilled: false }),
    ).toBeNull();
  });
});

describe('suggestDayFlow com a jornada (F19)', () => {
  it('antes da etapa 4 não sugere o corpo', () => {
    const p = progress({ morning: true, applicable: { morning: true, body: false, night: true } });
    expect(suggestDayFlow({ localTime: '13:30', prefs, progress: p })).toBeNull();
    expect(suggestDayFlow({ localTime: '10:00', prefs, progress: p })).toBeNull();
  });
});
