import { describe, expect, it } from 'vitest';
import type { DayProgress } from '@/lib/daily/progress';
import { DAY_MAX_POINTS, dayCandidates, isWindowOpen, weekCandidates, xpWindow, type WindowedSource } from './rules';

const TZ = 'Europe/Lisbon';
const iso = (d: Date) => d.toISOString();

const progress = (p: Partial<DayProgress>): DayProgress => ({
  date: '2026-05-06', hasEntry: true, morning: false, body: false, bodyChecks: 0, night: false, level: 'partial', ...p,
});

describe('janelas', () => {
  it('dia 2026-05-06: aberta até 23:59 do dia seguinte', () => {
    const w = xpWindow('DAY_MORNING', '2026-05-06', TZ);
    expect(iso(w.opens)).toBe('2026-05-05T23:00:00.000Z');
    expect(isWindowOpen(w, new Date('2026-05-07T22:59:00Z'))).toBe(true);
    expect(isWindowOpen(w, new Date('2026-05-07T23:00:00Z'))).toBe(false);
    expect(isWindowOpen(w, new Date('2026-05-05T22:59:00Z'))).toBe(false);
  });

  it('mudança de hora: dia 2026-03-28', () => {
    const w = xpWindow('DAY_BODY', '2026-03-28', TZ);
    expect(iso(w.opens)).toBe('2026-03-28T00:00:00.000Z');
    expect(iso(w.closes)).toBe('2026-03-29T23:00:00.000Z');
  });

  // Maio em Lisboa é UTC+1: meia-noite local = 23:00Z do dia anterior.
  const range = (source: WindowedSource, start: string) => {
    const w = xpWindow(source, start, TZ);
    return [iso(w.opens), iso(w.closes)];
  };

  it('semana de 2026-05-03: plano [30 abr, 6 mai), reflexão [8 mai, 11 mai)', () => {
    expect(range('WEEK_PLAN', '2026-05-03')).toEqual(['2026-04-29T23:00:00.000Z', '2026-05-05T23:00:00.000Z']);
    expect(range('WEEK_REFLECTION', '2026-05-03')).toEqual(['2026-05-07T23:00:00.000Z', '2026-05-10T23:00:00.000Z']);
  });

  it('maio de 2026: plano [24 abr, 8 mai), reflexão [25 mai, 2 jun)', () => {
    expect(range('MONTH_PLAN', '2026-05-01')).toEqual(['2026-04-23T23:00:00.000Z', '2026-05-07T23:00:00.000Z']);
    expect(range('MONTH_REFLECTION', '2026-05-01')).toEqual(['2026-05-24T23:00:00.000Z', '2026-06-01T23:00:00.000Z']);
  });

  it('ano: plano de 2027 [1 dez 2026, 1 fev 2027); reflexão de 2026 [15 dez 2026, 8 jan 2027)', () => {
    // Inverno em Lisboa: UTC+0.
    expect(range('YEAR_PLAN', '2027-01-01')).toEqual(['2026-12-01T00:00:00.000Z', '2027-02-01T00:00:00.000Z']);
    expect(range('YEAR_REFLECTION', '2026-01-01')).toEqual(['2026-12-15T00:00:00.000Z', '2027-01-08T00:00:00.000Z']);
  });

  it('mês de fevereiro: reflexão desde o dia 22 (28−6)', () => {
    expect(range('MONTH_REFLECTION', '2026-02-01')).toEqual(['2026-02-22T00:00:00.000Z', '2026-03-02T00:00:00.000Z']);
  });
});

describe('candidatos', () => {
  const inWindow = new Date('2026-05-06T12:00:00Z');

  it('só manhã completa → DAY_MORNING', () => {
    const c = dayCandidates({ date: '2026-05-06', progress: progress({ morning: true }), now: inWindow, tz: TZ });
    expect(c.map((x) => x.source)).toEqual(['DAY_MORNING']);
  });

  it('tudo → 4 candidatos (50 Glow)', () => {
    const c = dayCandidates({
      date: '2026-05-06', progress: progress({ morning: true, body: true, night: true, bodyChecks: 3, level: 'complete' }),
      now: inWindow, tz: TZ,
    });
    expect(c.map((x) => x.source)).toEqual(['DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'DAY_COMPLETE']);
    expect(c.reduce((s, x) => s + x.points, 0)).toBe(50);
    expect(DAY_MAX_POINTS).toBe(50);
  });

  it('janela fechada → nenhum', () => {
    const c = dayCandidates({
      date: '2026-05-06', progress: progress({ morning: true, body: true, night: true }),
      now: new Date('2026-05-08T09:00:00Z'), tz: TZ,
    });
    expect(c).toEqual([]);
  });

  const week = { start: '2026-05-03', now: new Date('2026-05-04T12:00:00Z'), tz: TZ };

  it('semana: intenção + 1 projecto não chega para WEEK_PLAN; + 2 chega', () => {
    expect(weekCandidates({ ...week, intention: 'Foco', projectsFilled: 1, reflection: '' })).toEqual([]);
    expect(weekCandidates({ ...week, intention: 'Foco', projectsFilled: 2, reflection: '' })).toEqual([
      { source: 'WEEK_PLAN', periodStart: '2026-05-03', points: 20 },
    ]);
  });

  it('semana: reflexão de 19 caracteres não conta; 20 conta (na janela da reflexão)', () => {
    const friday = new Date('2026-05-08T12:00:00Z');
    expect(weekCandidates({ ...week, now: friday, intention: '', projectsFilled: 0, reflection: 'a'.repeat(19) })).toEqual([]);
    expect(weekCandidates({ ...week, now: friday, intention: '', projectsFilled: 0, reflection: `  ${'a'.repeat(20)}  ` })).toEqual([
      { source: 'WEEK_REFLECTION', periodStart: '2026-05-03', points: 30 },
    ]);
  });

  it('reflexão fora da janela (terça) não conta', () => {
    expect(weekCandidates({ ...week, intention: '', projectsFilled: 0, reflection: 'a'.repeat(40) })).toEqual([]);
  });
});
