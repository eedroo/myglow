import 'server-only';
import type { Hemisphere, ProjectArea } from '@prisma/client';
import { db } from '@/lib/db';
import { compareDates, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { monthOf, monthRange } from '@/lib/weeks';
import { getMonthOverview } from '@/lib/month/overview';
import { getCachedRetrogradePeriods, getCachedSkyEvents } from '@/lib/astro/skyCache';
import type { SkyEvent } from '@/lib/astro/skyEvents';
import { getDailySky } from '@/lib/astro/sky';
import { computeDayProgress, PROGRESS_SELECT } from '@/lib/daily/progress';
import { computePeriodStats, computeYearMonthly, type DailyEntryLike } from '@/lib/stats/period';
import { PROJECT_AREAS } from '@/types/week';
import type { MonthPageData, Projects, YearPageData } from '@/types/planner';

const projectsFrom = (rows: { area: ProjectArea; text: string }[]): Projects => {
  const byArea = new Map(rows.map((r) => [r.area, r.text]));
  return Object.fromEntries(PROJECT_AREAS.map((a) => [a, byArea.get(a) ?? ''])) as Projects;
};

/** Eventos que merecem um marcador no calendário (as fases já têm o glifo da lua). */
const CALENDAR_EVENT_TYPES = new Set<SkyEvent['type']>(['LUNAR_ECLIPSE', 'SOLAR_ECLIPSE', 'SABBAT', 'SEASON', 'STATION']);

export async function getMonthPageData(
  userId: string,
  year: number,
  month: number,
  tz: string,
  hemisphere: Hemisphere,
): Promise<MonthPageData> {
  const { from, to } = monthRange(year, month);
  const monthStart = toDbDate(from);

  const [overview, plan, projects, weeks, sky, retrogrades] = await Promise.all([
    getMonthOverview(userId, year, month, tz),
    db.month.findUnique({ where: { userId_year_month: { userId, year, month } } }),
    db.projectIntention.findMany({ where: { userId, period: 'MONTH', periodStart: monthStart } }),
    db.week.findMany({
      where: { userId, startDate: { gte: monthStart, lte: toDbDate(to) }, weightGrams: { not: null } },
      select: { startDate: true, weightGrams: true },
    }),
    getCachedSkyEvents(from, to, tz, hemisphere),
    getCachedRetrogradePeriods(from, to, tz),
  ]);

  const eventDays: MonthPageData['overview']['eventDays'] = {};
  for (const e of sky) {
    if (CALENDAR_EVENT_TYPES.has(e.type)) (eventDays[e.date] ??= []).push(e);
  }

  // Signo do Sol no dia 1 + ingressos durante o mês.
  const ingresses = sky.filter((e): e is Extract<SkyEvent, { type: 'SUN_INGRESS' }> => e.type === 'SUN_INGRESS');
  const sunSigns = [
    { sign: getDailySky(from, tz).sun.sign, from },
    ...ingresses.filter((e) => e.date !== from).map((e) => ({ sign: e.sign, from: e.date })),
  ];

  return {
    plan: {
      year,
      month,
      intention: plan?.intention ?? '',
      reflection: plan?.reflection ?? '',
      projects: projectsFrom(projects),
      updatedAt: plan?.updatedAt.toISOString() ?? null,
    },
    overview: { ...overview, eventDays },
    sky,
    retrogrades,
    sunSigns,
    stats: computePeriodStats({
      from,
      to,
      today: overview.today,
      entries: overview.entries.filter((e) => e.date >= from && e.date <= to),
      weeks: weeks.map((w) => ({ startDate: fromDbDate(w.startDate), weightGrams: w.weightGrams })),
    }),
    isFuture: compareDates(from, overview.today) > 0,
  };
}

export async function getYearPageData(userId: string, year: number, tz: string, hemisphere: Hemisphere): Promise<YearPageData> {
  const from: DateISO = `${year}-01-01`;
  const to: DateISO = `${year}-12-31`;
  const today = todayInTz(tz);

  const [entries, months, plan, projects, weeks, sky, retrogrades] = await Promise.all([
    db.dailyEntry.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      select: { date: true, ...PROGRESS_SELECT },
    }),
    db.month.findMany({ where: { userId, year }, select: { month: true, intention: true } }),
    db.year.findUnique({ where: { userId_year: { userId, year } } }),
    db.projectIntention.findMany({ where: { userId, period: 'YEAR', periodStart: toDbDate(from) } }),
    db.week.findMany({
      where: { userId, startDate: { gte: toDbDate(from), lte: toDbDate(to) }, weightGrams: { not: null } },
      select: { startDate: true, weightGrams: true },
    }),
    getCachedSkyEvents(from, to, tz, hemisphere),
    getCachedRetrogradePeriods(from, to, tz),
  ]);

  const list: DailyEntryLike[] = entries.map((e) => ({ ...e, date: fromDbDate(e.date) }));
  const monthly = computeYearMonthly(year, today, list);
  const intentionByMonth = new Map(months.map((m) => [m.month, m.intention ?? '']));
  const current = monthOf(today);

  const levelsByMonth = new Map<number, Record<DateISO, ReturnType<typeof computeDayProgress>['level']>>();
  for (const e of list) {
    const m = Number(e.date.slice(5, 7));
    const levels = levelsByMonth.get(m) ?? {};
    levels[e.date] = computeDayProgress(e.date, e).level;
    levelsByMonth.set(m, levels);
  }

  return {
    plan: {
      year,
      word: plan?.word ?? '',
      intention: plan?.intention ?? '',
      reflection: plan?.reflection ?? '',
      projects: projectsFrom(projects),
      updatedAt: plan?.updatedAt.toISOString() ?? null,
    },
    months: monthly.map((stats) => ({
      month: stats.month,
      intention: intentionByMonth.get(stats.month) ?? '',
      stats,
      levels: levelsByMonth.get(stats.month) ?? {},
      isFuture: compareDates(monthRange(year, stats.month).from, today) > 0,
      isCurrent: current.year === year && current.month === stats.month,
    })),
    sky: sky.filter((e) => e.type === 'SABBAT' || e.type === 'SEASON' || e.type === 'LUNAR_ECLIPSE' || e.type === 'SOLAR_ECLIPSE'),
    retrogrades,
    stats: computePeriodStats({
      from,
      to,
      today,
      entries: list,
      weeks: weeks.map((w) => ({ startDate: fromDbDate(w.startDate), weightGrams: w.weightGrams })),
    }),
    today,
  };
}
