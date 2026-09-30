import type { XpSource } from '@prisma/client';
import { DateTime } from 'luxon';
import type { DateISO } from '@/lib/dates';
import type { DayProgress } from '@/lib/daily/progress';

/**
 * Regras do Glow (no código: xp). Funções puras.
 * Cada fonte tem pontos, um critério e uma janela [abre, fecha) em hora local do utilizador.
 */
export type XpKind = 'day' | 'week' | 'month' | 'year';
export interface XpWindow {
  opens: Date; // UTC
  closes: Date; // UTC
}
export interface XpCandidate {
  source: XpSource;
  periodStart: DateISO;
  points: number;
}

export type WindowedSource = Exclude<XpSource, 'STREAK_BONUS'>;

export const XP_POINTS: Record<XpSource, number> = {
  DAY_MORNING: 10,
  DAY_BODY: 10,
  DAY_NIGHT: 15,
  DAY_COMPLETE: 15,
  WEEK_PLAN: 20,
  WEEK_REFLECTION: 30,
  MONTH_PLAN: 40,
  MONTH_REFLECTION: 50,
  YEAR_PLAN: 100,
  YEAR_REFLECTION: 150,
  STREAK_BONUS: 0, // calculado à parte (streak.ts)
};

export const DAY_SOURCES = ['DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'DAY_COMPLETE'] as const satisfies readonly XpSource[];

/** Glow máximo de um dia (as quatro fontes do dia). */
export const DAY_MAX_POINTS = DAY_SOURCES.reduce((sum, s) => sum + XP_POINTS[s], 0);

/** Mínimo de caracteres (após trim) para uma reflexão contar. */
export const REFLECTION_MIN_CHARS = 20;
/** Mínimo de projectos/metas preenchidos para um plano contar. */
export const PLAN_MIN_PROJECTS = 2;

const local = (date: DateISO, tz: string) => DateTime.fromISO(date, { zone: tz }).startOf('day');
const win = (opens: DateTime, closes: DateTime): XpWindow => ({ opens: opens.toUTC().toJSDate(), closes: closes.toUTC().toJSDate() });

/** Janela de uma fonte para o período que começa em `periodStart` (dia, domingo, dia 1 do mês ou 1 de janeiro). */
export function xpWindow(source: WindowedSource, periodStart: DateISO, tz: string): XpWindow {
  const p = local(periodStart, tz);
  switch (source) {
    case 'DAY_MORNING':
    case 'DAY_BODY':
    case 'DAY_NIGHT':
    case 'DAY_COMPLETE':
      // Um dia conta até às 23:59 do dia seguinte.
      return win(p, p.plus({ days: 2 }));
    case 'WEEK_PLAN':
      return win(p.minus({ days: 3 }), p.plus({ days: 3 })); // quinta anterior → terça 23:59
    case 'WEEK_REFLECTION':
      return win(p.plus({ days: 5 }), p.plus({ days: 8 })); // sexta → domingo seguinte 23:59
    case 'MONTH_PLAN':
      return win(p.minus({ days: 7 }), p.plus({ days: 7 }));
    case 'MONTH_REFLECTION': {
      const last = p.endOf('month').startOf('day');
      return win(last.minus({ days: 6 }), p.plus({ months: 1, days: 1 })); // até ao fim do dia 1 do mês seguinte
    }
    case 'YEAR_PLAN':
      return win(p.minus({ months: 1 }), p.plus({ months: 1 })); // 1 dez do ano anterior → 31 jan
    case 'YEAR_REFLECTION':
      return win(p.set({ month: 12, day: 15 }), p.plus({ years: 1, days: 7 })); // 15 dez → 7 jan 23:59
  }
}

export function isWindowOpen(w: XpWindow, now: Date): boolean {
  return now >= w.opens && now < w.closes;
}

const filled = (s: string) => s.trim().length > 0;
const reflectionCounts = (s: string) => s.trim().length >= REFLECTION_MIN_CHARS;

/** Critério de "plano feito" (semana/mês/ano) — também usado pelos lembretes. */
export const planMet = (intention: string, projectsFilled: number) => filled(intention) && projectsFilled >= PLAN_MIN_PROJECTS;
/** Critério de "reflexão feita" — também usado pelos lembretes. */
export const reflectionMet = reflectionCounts;

function pick(sources: WindowedSource[], periodStart: DateISO, now: Date, tz: string): XpCandidate[] {
  return sources
    .filter((source) => isWindowOpen(xpWindow(source, periodStart, tz), now))
    .map((source) => ({ source, periodStart, points: XP_POINTS[source] }));
}

export function dayCandidates(i: { date: DateISO; progress: DayProgress; now: Date; tz: string }): XpCandidate[] {
  const met: WindowedSource[] = [];
  if (i.progress.morning) met.push('DAY_MORNING');
  if (i.progress.body) met.push('DAY_BODY');
  if (i.progress.night) met.push('DAY_NIGHT');
  if (i.progress.morning && i.progress.body && i.progress.night) met.push('DAY_COMPLETE');
  return pick(met, i.date, i.now, i.tz);
}

export function weekCandidates(i: {
  start: DateISO;
  intention: string;
  projectsFilled: number;
  reflection: string;
  now: Date;
  tz: string;
}): XpCandidate[] {
  const met: WindowedSource[] = [];
  if (filled(i.intention) && i.projectsFilled >= PLAN_MIN_PROJECTS) met.push('WEEK_PLAN');
  if (reflectionCounts(i.reflection)) met.push('WEEK_REFLECTION');
  return pick(met, i.start, i.now, i.tz);
}

export function monthCandidates(i: {
  monthStart: DateISO;
  intention: string;
  projectsFilled: number;
  reflection: string;
  now: Date;
  tz: string;
}): XpCandidate[] {
  const met: WindowedSource[] = [];
  if (filled(i.intention) && i.projectsFilled >= PLAN_MIN_PROJECTS) met.push('MONTH_PLAN');
  if (reflectionCounts(i.reflection)) met.push('MONTH_REFLECTION');
  return pick(met, i.monthStart, i.now, i.tz);
}

export function yearCandidates(i: {
  yearStart: DateISO;
  word: string;
  intention: string;
  projectsFilled: number;
  reflection: string;
  now: Date;
  tz: string;
}): XpCandidate[] {
  const met: WindowedSource[] = [];
  if (filled(i.word) && filled(i.intention) && i.projectsFilled >= PLAN_MIN_PROJECTS) met.push('YEAR_PLAN');
  if (reflectionCounts(i.reflection)) met.push('YEAR_REFLECTION');
  return pick(met, i.yearStart, i.now, i.tz);
}
