import 'server-only';
import type { GuidedFlow, GuideStatus, NotificationKind, RecapKind } from '@prisma/client';
import { estimateCostUsd } from '@/lib/guide/cost';
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
  /** F14: Guia nas últimas 4 semanas (só contagens, nunca conteúdo). */
  /** F15: amigos (só contagens). */
  friends: { friendships: number; activeWithFriend: number; active30: number; sent30: number; accepted30: number; invited: number; invited30: number };
  guide: { consented: number; byStatus: Record<GuideStatus, number>; rated: number; helped: number; inputTokens: number; outputTokens: number; costUsd: number };
  /** F18: modo guiado nos últimos 30 dias (iniciados e concluídos por fluxo; pessoas activas que o usaram). */
  guided: { byFlow: { flow: GuidedFlow; started: number; completed: number }[]; users30: number; active30: number };
  /**
   * F19: jornada. Pessoas por etapa, mediana de dias desde o registo até cada etapa (só desbloqueios reais, não os do
   * mapeamento), % que desbloqueou tudo e mini-lições vistas até ao fim vs fechadas antes.
   */
  journey: {
    byStage: { stage: number; users: number }[];
    medianDays: { unlockId: string; days: number | null; users: number }[];
    allUnlocked: number;
    total: number;
    ceremonies: { seen: number; dismissed: number };
  };
  /** F19: anúncios publicados (key → data). */
  announcements: { key: string; publishedAt: Date }[];
}

const RETENTION_WEEKS = 8;
const DAY_MS = 86_400_000;

export async function getAdminMetrics(now = new Date()): Promise<AdminMetrics> {
  const today = todayInTz('UTC', now);
  // Janela que cobre os 30 dias de actividade e as 8 coortes semanais + 30 dias de retenção.
  const since = addDays(today, -(RETENTION_WEEKS * 7 + 37));
  const ago = (d: number) => new Date(now.getTime() - d * DAY_MS);

  const [total, new7, new30, premium, interested, activeRows, signups, funnel, lessons7, coursesCompleted, fbTotal, fb7, notif, recaps, guideConsented, guideRows] =
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
      db.user.count({ where: { guideConsentAt: { not: null } } }),
      db.guideReport.groupBy({
        by: ['status'],
        where: { generatedAt: { gte: ago(28) } },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ]);
  const [friendships, sent30, accepted30, invited, invited30, activeWithFriendRows] = await Promise.all([
    db.friendship.count(),
    db.friendRequest.count({ where: { createdAt: { gte: ago(30) } } }),
    db.friendRequest.count({ where: { createdAt: { gte: ago(30) }, status: 'ACCEPTED' } }),
    db.user.count({ where: { invitedById: { not: null } } }),
    db.user.count({ where: { invitedById: { not: null }, createdAt: { gte: ago(30) } } }),
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(DISTINCT a."userId") AS n FROM "UserActiveDay" a
      WHERE a.day >= ${toDbDate(addDays(today, -29))}
        AND EXISTS (SELECT 1 FROM "Friendship" f WHERE f."userAId" = a."userId" OR f."userBId" = a."userId")`,
  ]);
  const [guideRated, guideHelped] = await Promise.all([
    db.guideReport.count({ where: { generatedAt: { gte: ago(28) }, rating: { not: null } } }),
    db.guideReport.count({ where: { generatedAt: { gte: ago(28) }, rating: 1 } }),
  ]);
  const byStatus: Record<GuideStatus, number> = { READY: 0, INSUFFICIENT: 0, SUPPORT: 0, FAILED: 0 };
  let inputTokens = 0;
  let outputTokens = 0;
  for (const g of guideRows) {
    byStatus[g.status] = g._count._all;
    inputTokens += g._sum.inputTokens ?? 0;
    outputTokens += g._sum.outputTokens ?? 0;
  }

  const [guidedRows, guidedUsers] = await Promise.all([
    db.$queryRaw<{ flow: GuidedFlow; started: bigint; completed: bigint }[]>`
      SELECT flow, count(*) AS started, count("completedAt") AS completed
      FROM "GuidedRun" WHERE "startedAt" >= ${ago(30)} GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(DISTINCT g."userId") AS n FROM "GuidedRun" g
      WHERE g."startedAt" >= ${ago(30)}
        AND EXISTS (SELECT 1 FROM "UserActiveDay" a WHERE a."userId" = g."userId" AND a.day >= ${toDbDate(addDays(today, -29))})`,
  ]);

  const [stageRows, medianRows, allUnlocked, ceremonyRows, announcements] = await Promise.all([
    db.$queryRaw<{ stage: number; n: bigint }[]>`SELECT "journeyStage" AS stage, count(*) AS n FROM "User" GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ unlockId: string; days: number | null; n: bigint }[]>`
      SELECT j."unlockId" AS "unlockId",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM j."unlockedAt" - u."createdAt") / 86400) AS days,
        count(*) AS n
      FROM "JourneyUnlock" j JOIN "User" u ON u.id = j."userId"
      WHERE (u."journeyMappedAt" IS NULL OR j."unlockedAt" > u."journeyMappedAt")
        AND (u."journeyAllUnlockedAt" IS NULL OR j."unlockedAt" < u."journeyAllUnlockedAt")
      GROUP BY 1 ORDER BY 1`,
    db.user.count({ where: { journeyAllUnlockedAt: { not: null } } }),
    db.$queryRaw<{ seen: bigint; dismissed: bigint }[]>`
      SELECT count(*) FILTER (WHERE NOT j."ceremonyDismissed") AS seen, count(*) FILTER (WHERE j."ceremonyDismissed") AS dismissed
      FROM "JourneyUnlock" j
      WHERE j."ceremonySeenAt" IS NOT NULL AND j."ceremonySeenAt" > j."unlockedAt"`,
    db.announcement.findMany({ orderBy: { publishedAt: 'desc' } }),
  ]);

  const rows: ActiveRow[] = activeRows.map((r) => ({ userId: r.userId, day: fromDbDate(r.day) }));
  const activity = activeUsers(rows, today);
  const signupRows: SignupRow[] = signups.map((u) => ({ userId: u.id, createdDay: todayInTz(u.timezone, u.createdAt) }));
  return {
    today,
    users: { total, new7, new30, premium, interested },
    activity: { ...activity, byDay: activeByDay(rows, today, 30) },
    funnel: funnelRates(funnel),
    retention: retention(signupRows, rows, today, RETENTION_WEEKS),
    grimoire: { lessons7, coursesCompleted },
    feedback: { total: fbTotal, last7: fb7 },
    notifications: notif.map((n) => ({ kind: n.kind, sent: Number(n.sent), opened: Number(n.opened) })),
    recaps: recaps.map((r) => ({ kind: r.kind, viewed: Number(r.viewed), completed: Number(r.completed) })),
    journey: {
      byStage: stageRows.map((r) => ({ stage: Number(r.stage), users: Number(r.n) })),
      medianDays: medianRows.map((r) => ({ unlockId: r.unlockId, days: r.days === null ? null : Math.round(Number(r.days) * 10) / 10, users: Number(r.n) })),
      allUnlocked,
      total,
      ceremonies: { seen: Number(ceremonyRows[0]?.seen ?? 0), dismissed: Number(ceremonyRows[0]?.dismissed ?? 0) },
    },
    announcements,
    guided: {
      byFlow: guidedRows.map((r) => ({ flow: r.flow, started: Number(r.started), completed: Number(r.completed) })),
      users30: Number(guidedUsers[0]?.n ?? 0),
      active30: activity.mau,
    },
    friends: {
      friendships,
      activeWithFriend: Number(activeWithFriendRows[0]?.n ?? 0),
      active30: activity.mau,
      sent30,
      accepted30,
      invited,
      invited30,
    },
    guide: {
      consented: guideConsented,
      byStatus,
      rated: guideRated,
      helped: guideHelped,
      inputTokens,
      outputTokens,
      costUsd: estimateCostUsd(inputTokens, outputTokens),
    },
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
