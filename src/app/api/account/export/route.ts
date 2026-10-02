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
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="myglow-export-${todayInTz(user.timezone)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
