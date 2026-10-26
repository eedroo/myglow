import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { allowExport } from '@/lib/ratelimit';
import { todayInTz } from '@/lib/dates';
import { buildExport } from '@/lib/account/export';

/** Exportação de todos os dados do utilizador (RGPD): JSON `myglow-export-v1`, como anexo. 3 por dia. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await allowExport(userId))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      birthProfile: true,
      dailyEntries: { orderBy: { date: 'asc' } },
      weeks: { orderBy: { startDate: 'asc' }, include: { dayNotes: { orderBy: { date: 'asc' } } } },
      months: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
      years: { orderBy: { year: 'asc' } },
      projectIntentions: { orderBy: { periodStart: 'asc' } },
      xpEvents: { orderBy: { createdAt: 'asc' } },
      lessonProgress: { orderBy: { completedAt: 'asc' } },
      courseProgress: { orderBy: { startedAt: 'asc' } },
      notificationPrefs: true,
      notificationLogs: { orderBy: { sentAt: 'asc' } },
      userAiContent: { orderBy: { periodStart: 'asc' } },
      activeDays: { orderBy: { day: 'asc' } },
      recapViews: { orderBy: { firstSeenAt: 'asc' } },
      guideReports: { orderBy: { generatedAt: 'asc' } },
      friendshipsA: { select: { createdAt: true, userB: { select: { id: true, name: true } } } },
      friendshipsB: { select: { createdAt: true, userA: { select: { id: true, name: true } } } },
      sentRequests: { select: { status: true, createdAt: true, respondedAt: true, to: { select: { name: true } } } },
      receivedRequests: { select: { status: true, createdAt: true, respondedAt: true, from: { select: { name: true } } } },
      blocks: { select: { createdAt: true, blocked: { select: { name: true } } } },
      fitnessPrefs: true,
      fitnessPrograms: { orderBy: { order: 'asc' }, include: { workouts: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } } } },
      fitnessSessions: { orderBy: { startedAt: 'asc' }, include: { sets: { orderBy: { completedAt: 'asc' } } } },
      customExercises: { orderBy: { id: 'asc' } },
    },
  });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = buildExport({
    user,
    birthProfile: user.birthProfile,
    dailyEntries: user.dailyEntries,
    weeks: user.weeks,
    months: user.months,
    years: user.years,
    projectIntentions: user.projectIntentions,
    xpEvents: user.xpEvents,
    lessonProgress: user.lessonProgress,
    courseProgress: user.courseProgress,
    notificationPrefs: user.notificationPrefs,
    notificationLog: user.notificationLogs,
    aiContent: user.userAiContent,
    activeDays: user.activeDays,
    recapViews: user.recapViews,
    guideReports: user.guideReports,
    friends: [
      ...user.friendshipsA.map((f) => ({ id: f.userB.id, name: f.userB.name, since: f.createdAt })),
      ...user.friendshipsB.map((f) => ({ id: f.userA.id, name: f.userA.name, since: f.createdAt })),
    ],
    friendRequests: [
      ...user.sentRequests.map((r) => ({ direction: 'sent' as const, otherName: r.to.name, status: r.status, createdAt: r.createdAt, respondedAt: r.respondedAt })),
      ...user.receivedRequests.map((r) => ({ direction: 'received' as const, otherName: r.from.name, status: r.status, createdAt: r.createdAt, respondedAt: r.respondedAt })),
    ],
    blocks: user.blocks.map((b) => ({ name: b.blocked.name, createdAt: b.createdAt })),
    fitness: {
      prefs: user.fitnessPrefs,
      programs: user.fitnessPrograms,
      sessions: user.fitnessSessions,
      customExercises: user.customExercises,
    },
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="myglow-export-${todayInTz(user.timezone)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
