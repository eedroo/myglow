import 'server-only';
import { db } from '@/lib/db';
import { addDays, compareDates, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { monthGrid, monthRange, weekDays, weekKey, weeksOfMonth } from '@/lib/weeks';
import { computeDayProgress, PROGRESS_SELECT, type DayProgress } from '@/lib/daily/progress';
import { getMoonCalendar, getMoonEvents, type MoonDay, type MoonEvent } from '@/lib/astro/moonCalendar';
import type { DailyEntryLike } from '@/lib/stats/period';
import type { SkyEvent } from '@/lib/astro/skyEvents';

export interface MonthOverview {
  year: number;
  month: number;
  today: DateISO;
  grid: (DateISO | null)[][];
  days: Record<DateISO, { progress: DayProgress; moon: MoonDay; isToday: boolean; isFuture: boolean }>;
  weeks: {
    start: DateISO;
    weekOfMonth: number;
    title: string;
    intention: string;
    daysTouched: number;
    daysComplete: number;
  }[];
  moonEvents: MoonEvent[];
  /** Entradas cruas do intervalo consultado (mês + fim da última semana), para estatísticas. */
  entries: DailyEntryLike[];
  /** Dias com eventos do céu destacados no calendário (preenchido pelo planner mensal). */
  eventDays: Record<DateISO, SkyEvent[]>;
}

/** Vista de navegação do mês: calendário com lua e progresso, semanas do mês e eventos lunares. */
export async function getMonthOverview(userId: string, year: number, month: number, tz: string): Promise<MonthOverview> {
  const { from, to } = monthRange(year, month);
  const sundays = weeksOfMonth(year, month);
  // As semanas do mês podem terminar no mês seguinte: ir buscar esses dias também.
  const lastSunday = sundays[sundays.length - 1];
  const rangeEnd = lastSunday && compareDates(addDays(lastSunday, 6), to) > 0 ? addDays(lastSunday, 6) : to;
  const today = todayInTz(tz);

  const [entries, weeks] = await Promise.all([
    db.dailyEntry.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(rangeEnd) } },
      select: { date: true, ...PROGRESS_SELECT },
    }),
    db.week.findMany({
      where: { userId, startDate: { in: sundays.map(toDbDate) } },
      select: { startDate: true, title: true, intention: true },
    }),
  ]);

  const progressByDate = new Map(entries.map((e) => [fromDbDate(e.date), computeDayProgress(fromDbDate(e.date), e)]));
  const progressOf = (date: DateISO) => progressByDate.get(date) ?? computeDayProgress(date, null);
  const weekByStart = new Map(weeks.map((w) => [fromDbDate(w.startDate), w]));
  const moon = getMoonCalendar(from, to, tz);

  const days: MonthOverview['days'] = {};
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
    days[d] = { progress: progressOf(d), moon: moon[d]!, isToday: d === today, isFuture: compareDates(d, today) > 0 };
  }

  return {
    year,
    month,
    today,
    grid: monthGrid(year, month),
    days,
    weeks: sundays.map((start) => {
      const w = weekByStart.get(start);
      const levels = weekDays(start).map((d) => progressOf(d).level);
      return {
        start,
        weekOfMonth: weekKey(start).weekOfMonth,
        title: w?.title ?? '',
        intention: w?.intention ?? '',
        daysTouched: levels.filter((l) => l !== 'empty').length,
        daysComplete: levels.filter((l) => l === 'complete').length,
      };
    }),
    moonEvents: getMoonEvents(from, to, tz),
    entries: entries.map((e) => ({ ...e, date: fromDbDate(e.date) })),
    eventDays: {},
  };
}
