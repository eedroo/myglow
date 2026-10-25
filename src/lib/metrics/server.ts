import 'server-only';
import type { NotificationKind, RecapKind } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, fromDbDate, todayInTz, toDbDate, type DateISO } from '@/lib/dates';
import { activeByDay, activeUsers, type ActiveRow, type SignupRow } from './active';
import { retention, type CohortRetention } from './retention';
import { funnelRates, type FunnelCounts } from './funnel';

/** Métricas da página /admin (calculadas a pedido; poucas centenas de pessoas). Só totais e contagens. */
export interface AdminMetrics {
  today: DateISO;
  users: { total: number; new7: number; new30: number; premium: number; interested: number };
  activity: ReturnType<typeof activeUsers> & { byDay: { day: DateISO; count: number }[] };
  funnel: ReturnType<typeof funnelRates>;
  retention: CohortRetention[];
  grimoire: { lessons7: number; coursesCompleted: number };
  feedback: { total: number; last7: number };
  notifications: { kind: NotificationKind; sent: number; opened: number }[];
  /** F13: retrospectivas abertas nas últimas 4 semanas, por tipo. */
  recaps: { kind: RecapKind; viewed: number; completed: number }[];
}

const RETENTION_WEEKS = 8;
const DAY_MS = 86_400_000;

export async function getAdminMetrics(now = new Date()): Promise<AdminMetrics> {
  const today = todayInTz('UTC', now);
  // Janela que cobre os 30 dias de actividade e as 8 coortes semanais + 30 dias de retenção.
  const since = addDays(today, -(RETENTION_WEEKS * 7 + 37));
  const ago = (d: number) => new Date(now.getTime() - d * DAY_MS);

  const [total, new7, new30, premium, interested, activeRows, signups, funnel, lessons7, coursesCompleted, fbTotal, fb7, notif, recaps] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: ago(7) } } }),
      db.user.count({ where: { createdAt: { gte: ago(30) } } }),
      db.user.count({ where: { plan: 'PREMIUM', OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] } }),
      db.user.count({ where: { premiumInterestAt: { not: null } } }),
      db.userActiveDay.findMany({ where: { day: { gte: toDbDate(since) } }, select: { userId: true, day: true } }),
      db.user.findMany({ where: { createdAt: { gte: toDbDate(since) } }, select: { id: true, createdAt: true, timezone: true } }),
      funnelCounts(),
      db.lessonProgress.count({ where: { completedAt: { gte: ago(7) } } }),
      db.courseProgress.count({ where: { completedAt: { not: null } } }),
      db.feedback.count(),
      db.feedback.count({ where: { createdAt: { gte: ago(7) } } }),
      db.$queryRaw<{ kind: NotificationKind; sent: bigint; opened: bigint }[]>`
        SELECT kind, count(*) AS sent, count("readAt") AS opened
        FROM "NotificationLog" WHERE "sentAt" >= ${ago(7)} GROUP BY 1 ORDER BY 2 DESC`,
      db.$queryRaw<{ kind: RecapKind; viewed: bigint; completed: bigint }[]>`
        SELECT kind, count(*) AS viewed, count("completedAt") AS completed
        FROM "RecapView" WHERE "firstSeenAt" >= ${ago(28)} GROUP BY 1 ORDER BY 1`,
    ]);

  const rows: ActiveRow[] = activeRows.map((r) => ({ userId: r.userId, day: fromDbDate(r.day) }));
  const signupRows: SignupRow[] = signups.map((u) => ({ userId: u.id, createdDay: todayInTz(u.timezone, u.createdAt) }));
  return {
    today,
    users: { total, new7, new30, premium, interested },
    activity: { ...activeUsers(rows, today), byDay: activeByDay(rows, today, 30) },
    funnel: funnelRates(funnel),
    retention: retention(signupRows, rows, today, RETENTION_WEEKS),
    grimoire: { lessons7, coursesCompleted },
    feedback: { total: fbTotal, last7: fb7 },
    notifications: notif.map((n) => ({ kind: n.kind, sent: Number(n.sent), opened: Number(n.opened) })),
    recaps: recaps.map((r) => ({ kind: r.kind, viewed: Number(r.viewed), completed: Number(r.completed) })),
  };
}

async function funnelCounts(): Promise<FunnelCounts> {
  const [registered, birthDone, tourDone, lessonUsers, completeDayUsers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { onboardedAt: { not: null } } }),
    db.user.count({ where: { tourCompletedAt: { not: null } } }),
    db.lessonProgress.groupBy({ by: ['userId'] }),
    db.xpEvent.groupBy({ by: ['userId'], where: { source: 'DAY_COMPLETE' } }),
  ]);
  return { registered, birthDone, tourDone, firstLesson: lessonUsers.length, firstCompleteDay: completeDayUsers.length };
}
