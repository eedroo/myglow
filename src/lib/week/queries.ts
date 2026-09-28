import 'server-only';
import { db } from '@/lib/db';
import { compareDates, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { weekDays, weekKey } from '@/lib/weeks';
import { computeDayProgress, PROGRESS_SELECT } from '@/lib/daily/progress';
import { getMoonCalendar, getMoonEvents } from '@/lib/astro/moonCalendar';
import { PROJECT_AREAS, type WeekData, type WeekPageData } from '@/types/week';
import type { ProjectArea } from '@prisma/client';

/** Tudo o que a página da semana precisa. Não cria registos. */
export async function getWeekPageData(userId: string, start: DateISO, tz: string): Promise<WeekPageData> {
  const days = weekDays(start);
  const end = days[6]!;
  const today = todayInTz(tz);

  const [week, projects, entries, previous] = await Promise.all([
    db.week.findUnique({
      where: { userId_startDate: { userId, startDate: toDbDate(start) } },
      include: { dayNotes: true },
    }),
    db.projectIntention.findMany({ where: { userId, period: 'WEEK', periodStart: toDbDate(start) } }),
    db.dailyEntry.findMany({
      where: { userId, date: { gte: toDbDate(start), lte: toDbDate(end) } },
      select: { date: true, ...PROGRESS_SELECT },
    }),
    db.week.findFirst({
      where: { userId, startDate: { lt: toDbDate(start) }, weightGrams: { not: null } },
      orderBy: { startDate: 'desc' },
      select: { weightGrams: true },
    }),
  ]);

  const notes = new Map(week?.dayNotes.map((n) => [fromDbDate(n.date), n.text]) ?? []);
  const projectText = new Map(projects.map((p) => [p.area, p.text]));
  const entryByDate = new Map(entries.map((e) => [fromDbDate(e.date), e]));
  const moon = getMoonCalendar(start, end, tz);

  const data: WeekData = {
    ...weekKey(start),
    title: week?.title ?? '',
    intention: week?.intention ?? '',
    weightGrams: week?.weightGrams ?? null,
    reflection: week?.reflection ?? '',
    dayNotes: Object.fromEntries(days.map((d) => [d, notes.get(d) ?? ''])),
    projects: Object.fromEntries(PROJECT_AREAS.map((a) => [a, projectText.get(a) ?? ''])) as Record<ProjectArea, string>,
    updatedAt: week?.updatedAt.toISOString() ?? null,
  };

  return {
    week: data,
    days: days.map((date) => ({
      date,
      progress: computeDayProgress(date, entryByDate.get(date) ?? null),
      moon: moon[date]!,
      isToday: date === today,
      isFuture: compareDates(date, today) > 0,
    })),
    moonEvents: getMoonEvents(start, end, tz),
    previousWeightGrams: previous?.weightGrams ?? null,
    today,
  };
}
