import { describe, expect, it } from 'vitest';
import type { DayProgress } from '@/lib/daily/progress';
import { dueCandidates, dueNotifications, type NotificationPrefsInput, type NotificationState } from './schedule';

const PREFS: NotificationPrefsInput = {
  enabled: true, morningTime: '08:00', bodyTime: '13:00', nightTime: '21:30',
  morningEnabled: true, bodyEnabled: true, nightEnabled: true,
  weekStart: true, weekEnd: true, monthStart: true, monthEnd: true,
};
const day = (p: Partial<DayProgress> = {}): DayProgress => ({
  date: '2026-05-06', hasEntry: false, morning: false, body: false, bodyChecks: 0, night: false, level: 'empty', ...p,
});
const TODO: NotificationState = {
  day: day(), weekPlanDone: false, weekReflectionDone: false, monthPlanDone: false, monthReflectionDone: false,
};
const LX = 'Europe/Lisbon';
const at = (iso: string, tz = LX, prefs = PREFS, state = TODO) => dueNotifications(new Date(iso), tz, prefs, state);

describe('dueNotifications', () => {
  it('manhã por fazer às 08:05 → MORNING do dia; completa → nada', () => {
    expect(at('2026-05-06T07:05:00Z')).toEqual([{ kind: 'MORNING', periodKey: '2026-05-06' }]);
    expect(at('2026-05-06T07:05:00Z', LX, PREFS, { ...TODO, day: day({ morning: true }) })).toEqual([]);
  });

  it('08:20 está fora do slot', () => {
    expect(at('2026-05-06T07:20:00Z')).toEqual([]);
  });

  it('morningEnabled = false → sem MORNING; enabled = false → nada', () => {
    expect(at('2026-05-06T07:05:00Z', LX, { ...PREFS, morningEnabled: false })).toEqual([]);
    expect(at('2026-05-06T07:05:00Z', LX, { ...PREFS, enabled: false })).toEqual([]);
    expect(dueCandidates(new Date('2026-05-06T07:05:00Z'), LX, { ...PREFS, enabled: false })).toEqual([]);
  });

  it('domingo 08:20 com plano por fazer → WEEK_START', () => {
    expect(at('2026-05-03T07:20:00Z')).toEqual([{ kind: 'WEEK_START', periodKey: 'W2026-05-03' }]);
    expect(at('2026-05-03T07:20:00Z', LX, PREFS, { ...TODO, weekPlanDone: true })).toEqual([]);
  });

  it('sábado 21:50 com reflexão por fazer → WEEK_END da semana (domingo)', () => {
    expect(at('2026-05-09T20:50:00Z')).toEqual([{ kind: 'WEEK_END', periodKey: 'W2026-05-03' }]);
  });

  it('último dia do mês 22:05 com reflexão por fazer → MONTH_END', () => {
    expect(at('2026-05-31T21:05:00Z')).toEqual([{ kind: 'MONTH_END', periodKey: 'M2026-05' }]);
  });

  it('dia 1 às 08:30 → MONTH_START', () => {
    expect(at('2026-06-01T07:35:00Z')).toEqual([{ kind: 'MONTH_START', periodKey: 'M2026-06' }]);
  });

  it('São Paulo 08:05 locais → MORNING', () => {
    expect(at('2026-05-06T11:05:00Z', 'America/Sao_Paulo')).toEqual([{ kind: 'MORNING', periodKey: '2026-05-06' }]);
  });

  it('mudança de hora: 2026-03-29 08:05 WEST → MORNING', () => {
    expect(at('2026-03-29T07:05:00Z')).toEqual([{ kind: 'MORNING', periodKey: '2026-03-29' }]);
  });

  it('corpo e noite nos seus horários', () => {
    expect(at('2026-05-06T12:10:00Z')).toEqual([{ kind: 'BODY', periodKey: '2026-05-06' }]);
    expect(at('2026-05-06T20:40:00Z')).toEqual([{ kind: 'NIGHT', periodKey: '2026-05-06' }]);
  });
});
