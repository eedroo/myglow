import 'server-only';
import type { Locale, NotificationKind } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, toDbDate, type DateISO } from '@/lib/dates';

/** Números do backoffice: só totais agregados, nunca conteúdo escrito por alguém. Dias em UTC. */
export interface AdminStats {
  users: { total: number; onboarded: number; active1d: number; active7d: number; active30d: number; new7d: number; withPush: number };
  days: { date: DateISO; signups: number; diaryPeople: number; lessons: number; grimoirePeople: number }[];
  courses: { slug: string; started: number; completed: number }[];
  notifications: { kind: NotificationKind; sent: number; opened: number }[];
  locales: { locale: Locale; users: number }[];
}

export const STATS_DAYS = 14;
const DAY_MS = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10) as DateISO;

/** Junta as contagens por dia numa lista contínua (os dias sem nada ficam a 0), do mais recente para o mais antigo. */
export function fillDays(
  today: DateISO,
  n: number,
  rows: { signups: Map<string, number>; diary: Map<string, number>; lessons: Map<string, { lessons: number; people: number }> },
): AdminStats['days'] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, -i);
    const l = rows.lessons.get(date);
    return {
      date,
      signups: rows.signups.get(date) ?? 0,
      diaryPeople: rows.diary.get(date) ?? 0,
      lessons: l?.lessons ?? 0,
      grimoirePeople: l?.people ?? 0,
    };
  });
}

export async function getAdminStats(now = new Date()): Promise<AdminStats> {
  const today = iso(now);
  const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const from = addDays(today, -(STATS_DAYS - 1));

  const [total, onboarded, active1d, active7d, active30d, new7d, push, signups, diary, lessons, courses, notifications, locales] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { onboardedAt: { not: null } } }),
      db.user.count({ where: { lastActiveAt: { gte: ago(1) } } }),
      db.user.count({ where: { lastActiveAt: { gte: ago(7) } } }),
      db.user.count({ where: { lastActiveAt: { gte: ago(30) } } }),
      db.user.count({ where: { createdAt: { gte: ago(7) } } }),
      db.pushSubscription.groupBy({ by: ['userId'] }),
      db.$queryRaw<{ day: Date; n: bigint }[]>`
        SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC')::date AS day, count(*) AS n
        FROM "User" WHERE "createdAt" >= ${toDbDate(from)} GROUP BY 1`,
      db.$queryRaw<{ day: Date; n: bigint }[]>`
        SELECT "date" AS day, count(DISTINCT "userId") AS n
        FROM "DailyEntry" WHERE "date" >= ${toDbDate(from)} AND "date" <= ${toDbDate(today)} GROUP BY 1`,
      db.$queryRaw<{ day: Date; lessons: bigint; people: bigint }[]>`
        SELECT "completedDate" AS day, count(*) AS lessons, count(DISTINCT "userId") AS people
        FROM "LessonProgress" WHERE "completedDate" >= ${toDbDate(from)} GROUP BY 1`,
      db.$queryRaw<{ slug: string; started: bigint; completed: bigint }[]>`
        SELECT "courseSlug" AS slug, count(*) AS started, count("completedAt") AS completed
        FROM "CourseProgress" GROUP BY 1 ORDER BY 2 DESC`,
      db.$queryRaw<{ kind: NotificationKind; sent: bigint; opened: bigint }[]>`
        SELECT kind, count(*) AS sent, count("readAt") AS opened
        FROM "NotificationLog" WHERE "sentAt" >= ${ago(7)} GROUP BY 1 ORDER BY 2 DESC`,
      db.user.groupBy({ by: ['locale'], _count: { _all: true }, orderBy: { _count: { locale: 'desc' } } }),
    ]);

  return {
    users: { total, onboarded, active1d, active7d, active30d, new7d, withPush: push.length },
    days: fillDays(today, STATS_DAYS, {
      signups: new Map(signups.map((r) => [iso(r.day), Number(r.n)])),
      diary: new Map(diary.map((r) => [iso(r.day), Number(r.n)])),
      lessons: new Map(lessons.map((r) => [iso(r.day), { lessons: Number(r.lessons), people: Number(r.people) }])),
    }),
    courses: courses.map((c) => ({ slug: c.slug, started: Number(c.started), completed: Number(c.completed) })),
    notifications: notifications.map((r) => ({ kind: r.kind, sent: Number(r.sent), opened: Number(r.opened) })),
    locales: locales.map((l) => ({ locale: l.locale, users: l._count._all })),
  };
}
