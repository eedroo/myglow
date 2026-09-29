import { describe, expect, it } from 'vitest';
import { currentUserJobs, dueUserJobs, nextSignPeriod } from './schedule';

describe('dueUserJobs', () => {
  it('Lisboa 03:30 de quinta → DAY_PERSONAL + WEEK_PERSONAL da semana seguinte', () => {
    expect(dueUserJobs(new Date('2026-10-01T02:30:00Z'), 'Europe/Lisbon')).toEqual([
      { kind: 'DAY_PERSONAL', periodStart: '2026-10-01' },
      { kind: 'WEEK_PERSONAL', periodStart: '2026-10-04' },
    ]);
  });

  it('Lisboa dia 24 → MONTH_PERSONAL e MONTH_RITUALS do mês seguinte', () => {
    const jobs = dueUserJobs(new Date('2026-10-24T02:10:00Z'), 'Europe/Lisbon');
    expect(jobs).toEqual([
      { kind: 'DAY_PERSONAL', periodStart: '2026-10-24' },
      { kind: 'MONTH_PERSONAL', periodStart: '2026-11-01' },
      { kind: 'MONTH_RITUALS', periodStart: '2026-11-01' },
    ]);
  });

  it('São Paulo às 03:xx locais (06:xx UTC)', () => {
    expect(dueUserJobs(new Date('2026-10-05T06:45:00Z'), 'America/Sao_Paulo')).toEqual([
      { kind: 'DAY_PERSONAL', periodStart: '2026-10-05' },
    ]);
    expect(dueUserJobs(new Date('2026-10-05T02:45:00Z'), 'America/Sao_Paulo')).toEqual([]);
  });

  it('fora das 03:xx locais → nada', () => {
    expect(dueUserJobs(new Date('2026-10-01T03:30:00Z'), 'Europe/Lisbon')).toEqual([]);
  });
});

describe('currentUserJobs / nextSignPeriod', () => {
  it('hoje, semana e mês actuais', () => {
    expect(currentUserJobs(new Date('2026-10-01T12:00:00Z'), 'Europe/Lisbon').map((j) => j.periodStart)).toEqual([
      '2026-10-01', '2026-09-27', '2026-10-01', '2026-10-01',
    ]);
  });

  it('crons partilhados: amanhã, domingo seguinte, mês seguinte (UTC)', () => {
    const thu = new Date('2026-10-01T06:00:00Z');
    expect(nextSignPeriod('DAY_HOROSCOPE', thu)).toBe('2026-10-02');
    expect(nextSignPeriod('WEEK_ENERGY', thu)).toBe('2026-10-04');
    expect(nextSignPeriod('MONTH_ENERGY', new Date('2026-12-20T06:00:00Z'))).toBe('2027-01-01');
  });
});
