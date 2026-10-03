import { DateTime } from 'luxon';
import type { SignContentKind, UserContentKind } from '@prisma/client';
import { addDays, todayInTz, type DateISO } from '@/lib/dates';
import { addMonths, monthKey, monthOf, weekStartOf } from '@/lib/weeks';

/** O que gerar e quando. Puro e testável. */
export interface UserJob {
  kind: UserContentKind;
  periodStart: DateISO;
}

export interface SignJob {
  kind: SignContentKind;
  periodStart: DateISO;
}

const firstOfMonth = (year: number, month: number): DateISO => `${monthKey(year, month)}-01`;

/**
 * Trabalhos devidos para um utilizador na hora `now` (corrida horária): só às 03:xx locais.
 * Sempre DAY_PERSONAL de hoje; à quinta WEEK_PERSONAL da semana seguinte; a 24 MONTH_* do mês seguinte.
 */
export function dueUserJobs(now: Date, tz: string): UserJob[] {
  const local = DateTime.fromJSDate(now, { zone: tz });
  if (local.hour !== 3) return [];
  const today = todayInTz(tz, now);
  const jobs: UserJob[] = [{ kind: 'DAY_PERSONAL', periodStart: today }];
  if (local.weekday === 4) jobs.push({ kind: 'WEEK_PERSONAL', periodStart: addDays(weekStartOf(today), 7) });
  if (local.day === 24) {
    const { year, month } = monthOf(today);
    const next = addMonths(year, month, 1);
    const start = firstOfMonth(next.year, next.month);
    jobs.push({ kind: 'MONTH_PERSONAL', periodStart: start }, { kind: 'MONTH_RITUALS', periodStart: start });
  }
  return jobs;
}

/** Conteúdo actual (depois do onboarding, ao mudar de língua ou a pedido): hoje, esta semana, este mês. */
export function currentUserJobs(now: Date, tz: string): UserJob[] {
  const today = todayInTz(tz, now);
  const { year, month } = monthOf(today);
  const start = firstOfMonth(year, month);
  return [
    { kind: 'DAY_PERSONAL', periodStart: today },
    { kind: 'WEEK_PERSONAL', periodStart: weekStartOf(today) },
    { kind: 'MONTH_PERSONAL', periodStart: start },
    { kind: 'MONTH_RITUALS', periodStart: start },
  ];
}

/**
 * Conteúdo partilhado actual (UTC) — usado pelo seed. Só o mês: o horóscopo do dia e a energia da semana por
 * signo deixaram de ser gerados (o dia e a semana mostram só a leitura pessoal).
 */
export function currentSignJobs(now: Date): SignJob[] {
  const { year, month } = monthOf(todayInTz('UTC', now));
  return [{ kind: 'MONTH_ENERGY', periodStart: firstOfMonth(year, month) }];
}

/** Próximo período partilhado para os crons (UTC): amanhã, a semana seguinte, o mês seguinte. */
export function nextSignPeriod(kind: SignContentKind, now: Date): DateISO {
  const today = todayInTz('UTC', now);
  if (kind === 'DAY_HOROSCOPE') return addDays(today, 1);
  if (kind === 'WEEK_ENERGY') return addDays(weekStartOf(today), 7);
  const { year, month } = monthOf(today);
  const next = addMonths(year, month, 1);
  return firstOfMonth(next.year, next.month);
}
