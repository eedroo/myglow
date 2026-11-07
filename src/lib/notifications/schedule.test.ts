import { describe, expect, it } from 'vitest';
import type { DayProgress } from '@/lib/daily/progress';
import { applyBackoff, dueCandidates, dueNotifications, type NotificationPrefsInput, type NotificationState } from './schedule';

const PREFS: NotificationPrefsInput = {
  enabled: true, morningTime: '08:00', bodyTime: '13:00', nightTime: '21:30',
  morningEnabled: true, bodyEnabled: true, nightEnabled: true,
  weekStart: true, weekEnd: true, monthStart: true, monthEnd: true, lastCall: true,
  grimoireEnabled: true, grimoireTime: '10:00',
};
const day = (p: Partial<DayProgress> = {}): DayProgress => ({
  date: '2026-05-06', hasEntry: false, morning: false, body: false, bodyChecks: 0, night: false, level: 'empty', applicable: { morning: true, body: true, night: true }, ...p,
});
const TODO: NotificationState = {
  day: day(), weekPlanDone: false, weekReflectionDone: false, monthPlanDone: false, monthReflectionDone: false,
  lastWeekReflectionDone: false, lastMonthReflectionDone: false, grimoire: { lessonsLeft: 0, quizPending: false },
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

  it('domingo 08:05: WEEK_START no lugar da manhã (plano ou reflexão da semana que passou por fazer)', () => {
    expect(at('2026-05-03T07:05:00Z')).toEqual([{ kind: 'WEEK_START', periodKey: 'W2026-05-03' }]);
    // Só a reflexão da semana que passou por fazer: continua a sair.
    expect(at('2026-05-03T07:05:00Z', LX, PREFS, { ...TODO, weekPlanDone: true })).toEqual([{ kind: 'WEEK_START', periodKey: 'W2026-05-03' }]);
    // Tudo feito: volta o aviso normal da manhã.
    expect(at('2026-05-03T07:05:00Z', LX, PREFS, { ...TODO, weekPlanDone: true, lastWeekReflectionDone: true })).toEqual([
      { kind: 'MORNING', periodKey: '2026-05-03' },
    ]);
    expect(at('2026-05-03T07:20:00Z')).toEqual([]);
  });

  it('a reflexão já não tem aviso ao sábado nem no último dia do mês', () => {
    expect(at('2026-05-09T20:50:00Z')).toEqual([]);
    expect(at('2026-05-31T21:05:00Z')).toEqual([]);
  });

  it('dia 1 às 08:05: MONTH_START no lugar da manhã', () => {
    expect(at('2026-06-01T07:05:00Z')).toEqual([{ kind: 'MONTH_START', periodKey: 'M2026-06' }]);
    expect(at('2026-06-01T07:05:00Z', LX, PREFS, { ...TODO, monthUnlocked: false })).toEqual([{ kind: 'MORNING', periodKey: '2026-06-01' }]);
  });

  it('dia 1 num domingo: só MONTH_START (leva a semana e a manhã)', () => {
    expect(at('2026-11-01T08:05:00Z')).toEqual([{ kind: 'MONTH_START', periodKey: 'M2026-11' }]);
  });

  it('abriu o planeamento da próxima semana: quinta 21:45, só com o plano por fazer', () => {
    const state = { ...TODO, nextWeekPlanDone: false };
    expect(at('2026-05-07T20:50:00Z', LX, PREFS, state)).toEqual([{ kind: 'WEEK_PLAN_OPEN', periodKey: 'W2026-05-10' }]);
    expect(at('2026-05-07T20:50:00Z', LX, PREFS, { ...state, nextWeekPlanDone: true })).toEqual([]);
    expect(at('2026-05-07T20:50:00Z', LX, { ...PREFS, weekStart: false }, state)).toEqual([]);
  });

  it('abriu o planeamento do mês seguinte: 7 dias antes do dia 1, 22:00', () => {
    const state = { ...TODO, nextMonthPlanDone: false };
    expect(at('2026-05-25T21:05:00Z', LX, PREFS, state)).toEqual([{ kind: 'MONTH_PLAN_OPEN', periodKey: 'M2026-06' }]);
    expect(at('2026-05-24T21:05:00Z', LX, PREFS, state)).toEqual([]);
    expect(at('2026-05-25T21:05:00Z', LX, PREFS, { ...state, monthUnlocked: false })).toEqual([]);
  });

  it('última chamada do plano da semana: terça 21:45', () => {
    expect(at('2026-05-05T20:50:00Z')).toEqual([{ kind: 'WEEK_PLAN_LAST', periodKey: 'W2026-05-03' }]);
    expect(at('2026-05-05T20:50:00Z', LX, PREFS, { ...TODO, weekPlanDone: true })).toEqual([]);
    expect(at('2026-05-05T20:50:00Z', LX, { ...PREFS, lastCall: false })).toEqual([]);
  });

  it('última chamada da reflexão da semana anterior: domingo 21:45', () => {
    expect(at('2026-05-10T20:50:00Z')).toEqual([{ kind: 'WEEK_REFLECTION_LAST', periodKey: 'W2026-05-03' }]);
    expect(at('2026-05-10T20:50:00Z', LX, PREFS, { ...TODO, lastWeekReflectionDone: true })).toEqual([]);
  });

  it('última chamada do plano do mês: dia 7 às 22:00', () => {
    expect(at('2026-05-07T21:05:00Z')).toEqual([{ kind: 'MONTH_PLAN_LAST', periodKey: 'M2026-05' }]);
  });

  it('última chamada da reflexão do mês anterior: dia 1 às 22:00', () => {
    expect(at('2026-06-01T21:05:00Z')).toEqual([{ kind: 'MONTH_REFLECTION_LAST', periodKey: 'M2026-05' }]);
    expect(at('2026-01-01T22:05:00Z')).toEqual([{ kind: 'MONTH_REFLECTION_LAST', periodKey: 'M2025-12' }]);
  });

  it('São Paulo 08:05 locais → MORNING', () => {
    expect(at('2026-05-06T11:05:00Z', 'America/Sao_Paulo')).toEqual([{ kind: 'MORNING', periodKey: '2026-05-06' }]);
  });

  it('mudança de hora: 2026-03-29 (domingo) 08:05 WEST → aviso da manhã à hora certa', () => {
    expect(at('2026-03-29T07:05:00Z', LX, PREFS, { ...TODO, weekPlanDone: true, lastWeekReflectionDone: true })).toEqual([
      { kind: 'MORNING', periodKey: '2026-03-29' },
    ]);
  });

  it('Grimório: já não há avisos (nem convite, nem última chamada)', () => {
    const LESSONS = { ...TODO, grimoire: { lessonsLeft: 3, quizPending: true } };
    expect(at('2026-05-06T09:05:00Z', LX, PREFS, LESSONS)).toEqual([]);
    expect(at('2026-05-06T21:20:00Z', LX, PREFS, LESSONS)).toEqual([]);
  });

  it('diários: só manhã, corpo e noite ao longo do dia', () => {
    const kinds = new Set<string>();
    for (let m = 0; m < 24 * 60; m += 15) {
      const iso = new Date(Date.UTC(2026, 4, 6, 0, m) - 60 * 60_000).toISOString(); // Lisboa (WEST, UTC+1)
      at(iso, LX, { ...PREFS, weighInTime: '08:00' }, { ...TODO, weighedToday: false }).forEach((d) => kinds.add(d.kind));
    }
    expect([...kinds].sort()).toEqual(['BODY', 'MORNING', 'NIGHT']);
  });

  it('corpo e noite nos seus horários', () => {
    expect(at('2026-05-06T12:10:00Z')).toEqual([{ kind: 'BODY', periodKey: '2026-05-06' }]);
    expect(at('2026-05-06T20:40:00Z')).toEqual([{ kind: 'NIGHT', periodKey: '2026-05-06' }]);
  });
});

describe('applyBackoff', () => {
  const today = '2026-05-10';
  const sent = (kind: 'MORNING' | 'NIGHT' | 'WEEK_START', day: string, read = false) => ({ kind, periodKey: day, read });
  const todo = [{ kind: 'MORNING' as const, periodKey: today }];

  it('menos de 3 ignorados seguidos: envia', () => {
    expect(applyBackoff(todo, [sent('MORNING', '2026-05-09'), sent('MORNING', '2026-05-08')], today)).toEqual(todo);
  });

  it('3 ignorados seguidos e o último ontem: hoje não envia (dia sim, dia não)', () => {
    const h = [sent('MORNING', '2026-05-09'), sent('MORNING', '2026-05-08'), sent('MORNING', '2026-05-07')];
    expect(applyBackoff(todo, h, today)).toEqual([]);
  });

  it('em recuo, o último foi anteontem: hoje envia', () => {
    const h = [sent('MORNING', '2026-05-08'), sent('MORNING', '2026-05-06'), sent('MORNING', '2026-05-04')];
    expect(applyBackoff(todo, h, today)).toEqual(todo);
  });

  it('abrir um quebra o recuo', () => {
    const h = [sent('MORNING', '2026-05-09', true), sent('MORNING', '2026-05-08'), sent('MORNING', '2026-05-07'), sent('MORNING', '2026-05-06')];
    expect(applyBackoff(todo, h, today)).toEqual(todo);
  });

  it('cada tipo conta à parte e os semanais/mensais nunca recuam', () => {
    const h = [sent('NIGHT', '2026-05-09'), sent('NIGHT', '2026-05-08'), sent('NIGHT', '2026-05-07')];
    expect(applyBackoff(todo, h, today)).toEqual(todo);
    const week = [{ kind: 'WEEK_START' as const, periodKey: 'W2026-05-10' }];
    expect(applyBackoff(week, [], today)).toEqual(week);
  });
});

describe('jornada (F19)', () => {
  const stage1 = day({ applicable: { morning: true, body: false, night: true } });

  it('BODY não sai antes da etapa 4 (corpo não aplicável)', () => {
    expect(at('2026-05-06T12:05:00Z')).toEqual([{ kind: 'BODY', periodKey: '2026-05-06' }]);
    expect(at('2026-05-06T12:05:00Z', LX, PREFS, { ...TODO, day: stage1 })).toEqual([]);
  });

  it('MORNING continua a sair com a manhã aplicável e por fazer', () => {
    expect(at('2026-05-06T07:05:00Z', LX, PREFS, { ...TODO, day: stage1 })).toEqual([{ kind: 'MORNING', periodKey: '2026-05-06' }]);
  });

  it('avisos do mês só com o Mês desbloqueado', () => {
    expect(at('2026-05-31T21:05:00Z', LX, PREFS, { ...TODO, monthUnlocked: false })).toEqual([]);
  });
});
