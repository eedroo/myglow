import { DateTime } from 'luxon';
import { todayInTz } from '@/lib/dates';
import { previousMonthPeriod, previousWeekPeriod } from '@/lib/recap/period';

/**
 * Quando gerar o Guia (F14), no fuso da pessoa: semana anterior ao domingo entre as 04:00 e as 05:00;
 * mês anterior no dia 1 entre as 04:30 e as 05:30. Pura (o cron corre de hora a hora).
 */
export function dueGuideJobs(now: Date, tz: string): { kind: 'WEEK' | 'MONTH'; periodKey: string }[] {
  const local = DateTime.fromJSDate(now, { zone: tz });
  const minutes = local.hour * 60 + local.minute;
  const today = todayInTz(tz, now);
  const jobs: { kind: 'WEEK' | 'MONTH'; periodKey: string }[] = [];
  if (local.weekday === 7 && minutes >= 4 * 60 && minutes < 5 * 60) jobs.push({ kind: 'WEEK', periodKey: previousWeekPeriod(today).key });
  if (local.day === 1 && minutes >= 4 * 60 + 30 && minutes < 5 * 60 + 30) jobs.push({ kind: 'MONTH', periodKey: previousMonthPeriod(today).key });
  return jobs;
}
