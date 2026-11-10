import { describe, expect, it } from 'vitest';
import type { DayProgress } from '@/lib/daily/progress';
import { autoOpenFlow, autoOpenTarget, earlyHoursSuggestion, isEarlyHours, suggestDayFlow, suggestPeriodFlow } from './suggest';

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

describe('autoOpenFlow', () => {
  const base = { nightTime: '21:00', startedToday: [] as ('DAY_MORNING' | 'DAY_NIGHT')[] };
  it('primeira abertura do dia com a manhã por fazer → manhã (mesmo à tarde)', () => {
    expect(autoOpenFlow({ ...base, localTime: '07:30', progress: progress({}) })).toBe('DAY_MORNING');
    expect(autoOpenFlow({ ...base, localTime: '16:00', progress: progress({}) })).toBe('DAY_MORNING');
  });
  it('manhã feita ou já aberta hoje → nada (o corpo nunca abre sozinho)', () => {
    expect(autoOpenFlow({ ...base, localTime: '13:00', progress: progress({ morning: true }) })).toBeNull();
    expect(autoOpenFlow({ ...base, localTime: '09:00', progress: progress({}), startedToday: ['DAY_MORNING'] })).toBeNull();
  });
  it('a partir da hora da noite → noite, se por fazer e ainda não aberta', () => {
    expect(autoOpenFlow({ ...base, localTime: '21:00', progress: progress({ morning: true }) })).toBe('DAY_NIGHT');
    expect(autoOpenFlow({ ...base, localTime: '22:30', progress: progress({}) })).toBe('DAY_NIGHT');
    expect(autoOpenFlow({ ...base, localTime: '22:30', progress: progress({ night: true }) })).toBeNull();
    expect(autoOpenFlow({ ...base, localTime: '22:30', progress: progress({}), startedToday: ['DAY_NIGHT'] })).toBeNull();
  });
  it('partes não aplicáveis na jornada não abrem', () => {
    const p = progress({ applicable: { morning: false, body: false, night: false } });
    expect(autoOpenFlow({ ...base, localTime: '08:00', progress: p })).toBeNull();
  });
});

describe('madrugada', () => {
  it('até às 05:59 (ou até ao aviso da manhã, se for mais cedo) é madrugada', () => {
    expect(isEarlyHours('01:00', '08:00')).toBe(true);
    expect(isEarlyHours('05:59', '08:00')).toBe(true);
    expect(isEarlyHours('06:00', '08:00')).toBe(false);
    expect(isEarlyHours('05:30', '05:15')).toBe(false);
    expect(isEarlyHours('05:00', '05:15')).toBe(true);
  });
  it('à 1 da manhã: nada do dia novo; abre a noite de ontem se estiver por fazer', () => {
    const today = progress({});
    const base = { localTime: '01:00', morningTime: '08:00', nightTime: '21:00', progress: today, startedToday: [] as ('DAY_MORNING' | 'DAY_NIGHT')[] };
    expect(suggestDayFlow({ localTime: '01:00', prefs, progress: today })).toBeNull();
    expect(autoOpenTarget({ ...base, yesterday: { progress: progress({ morning: true }), started: [] } })).toEqual({ flow: 'DAY_NIGHT', day: 'yesterday' });
    expect(autoOpenTarget({ ...base, yesterday: { progress: progress({ night: true }), started: [] } })).toBeNull();
    expect(autoOpenTarget({ ...base, yesterday: { progress: progress({}), started: ['DAY_NIGHT'] } })).toBeNull();
    expect(autoOpenTarget({ ...base, yesterday: null })).toBeNull();
  });
  it('às 06:00 volta ao normal: a manhã de hoje', () => {
    const y = { progress: progress({}), started: [] };
    expect(autoOpenTarget({ localTime: '06:00', morningTime: '08:00', nightTime: '21:00', progress: progress({}), startedToday: [], yesterday: y })).toEqual({ flow: 'DAY_MORNING', day: 'today' });
  });
  it('sugestão do Hoje na madrugada: a noite de ontem por fazer', () => {
    expect(earlyHoursSuggestion({ localTime: '02:00', morningTime: '08:00', yesterday: progress({}) })).toBe('DAY_NIGHT');
    expect(earlyHoursSuggestion({ localTime: '02:00', morningTime: '08:00', yesterday: progress({ night: true }) })).toBeNull();
    expect(earlyHoursSuggestion({ localTime: '07:00', morningTime: '08:00', yesterday: progress({}) })).toBeNull();
  });
});
