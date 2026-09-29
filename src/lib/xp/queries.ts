import 'server-only';
import type { XpSource } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { levelFor } from './levels';
import { DAY_MAX_POINTS, DAY_SOURCES } from './rules';
import { currentMagicStreak } from './streak';
import type { XpAward } from './award';

export interface GlowSummary {
  total: number;
  level: ReturnType<typeof levelFor>;
  levelSeen: number;
  magicStreak: number;
  bestMagicStreak: number;
  today: { earned: number; possible: typeof DAY_MAX_POINTS };
}

export async function getGlowSummary(userId: string, tz: string): Promise<GlowSummary> {
  const today = todayInTz(tz);
  const [user, dayEvents] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { xpTotal: true, levelSeen: true, bestMagicStreak: true } }),
    db.xpEvent.findMany({
      where: { userId, source: { in: [...DAY_SOURCES] }, periodStart: { gte: toDbDate(addDays(today, -400)) } },
      select: { periodStart: true, points: true },
    }),
  ]);
  const dates = dayEvents.map((e) => fromDbDate(e.periodStart));
  const magicStreak = currentMagicStreak(dates, today);

  return {
    total: user.xpTotal,
    level: levelFor(user.xpTotal),
    levelSeen: user.levelSeen,
    magicStreak,
    bestMagicStreak: Math.max(user.bestMagicStreak, magicStreak),
    today: {
      earned: dayEvents.filter((e) => fromDbDate(e.periodStart) === today).reduce((s, e) => s + e.points, 0),
      possible: DAY_MAX_POINTS,
    },
  };
}

/** Últimos eventos do ledger (mais recentes primeiro). */
export async function getGlowHistory(userId: string, take = 30): Promise<(XpAward & { createdAt: string })[]> {
  const rows = await db.xpEvent.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { periodStart: 'desc' }],
    take,
    select: { source: true, periodStart: true, points: true, createdAt: true },
  });
  return rows.map((r) => ({
    source: r.source,
    periodStart: fromDbDate(r.periodStart),
    points: r.points,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Fontes já ganhas para um período (ex.: WEEK_PLAN / WEEK_REFLECTION de uma semana). */
export async function getPeriodAwards(userId: string, sources: XpSource[], periodStart: DateISO): Promise<XpSource[]> {
  const rows = await db.xpEvent.findMany({
    where: { userId, source: { in: sources }, periodStart: toDbDate(periodStart) },
    select: { source: true },
  });
  return rows.map((r) => r.source);
}
