import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';
import { todayInTz, toDbDate } from '@/lib/dates';

/** Ainda não há registo de actividade para hoje (no fuso da pessoa)? */
export function shouldTouch(lastActiveAt: Date | null, timezone: string, now: Date): boolean {
  if (!lastActiveAt) return true;
  return todayInTz(timezone, lastActiveAt) !== todayInTz(timezone, now);
}

/**
 * Um registo por dia em que a pessoa abriu a app (DAU/WAU/MAU e retenção) + `lastActiveAt`.
 * Chamado no layout sem esperar pelo resultado; erros vão para o Sentry e nunca chegam à página.
 */
export function touchActivity(userId: string, timezone: string, lastActiveAt: Date | null, now = new Date()): void {
  if (!shouldTouch(lastActiveAt, timezone, now)) return;
  const day = toDbDate(todayInTz(timezone, now));
  void db
    .$transaction([
      db.userActiveDay.upsert({ where: { userId_day: { userId, day } }, create: { userId, day }, update: {} }),
      db.user.update({ where: { id: userId }, data: { lastActiveAt: now } }),
    ])
    .catch((err: unknown) => {
      Sentry.captureException(err, { tags: { job: 'touch-activity' } });
    });
}
