import 'server-only';
import type { Hemisphere, Locale } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, toDbDate, type DateISO } from '@/lib/dates';
import { addMonths, monthOf, weekStartOf } from '@/lib/weeks';
import { computeDayProgress, PROGRESS_SELECT } from '@/lib/daily/progress';
import { planMet, reflectionMet } from '@/lib/xp/rules';
import { getDailyMoon } from '@/lib/astro/moon';
import { getSkyEvents, type SabbatKey } from '@/lib/astro/skyEvents';
import { getRituals } from '@/lib/ai/queries';
import { getGrimoireDayStatus } from '@/lib/grimoire/queries';
import { USER_SCHEMAS } from '@/lib/ai/schemas';
import type { NotificationContext } from './content';
import type { NotificationState } from './schedule';

/** Leituras leves para os lembretes e para a caixa de avisos. */

/** O que está feito no dia `date` e na semana/mês que o contêm (mesmos critérios do Glow) e o Grimório do dia. */
export async function notificationState(userId: string, date: DateISO, locale: Locale): Promise<NotificationState> {
  const weekStart = toDbDate(weekStartOf(date));
  const { year, month } = monthOf(date);
  const monthStart = toDbDate(`${date.slice(0, 7)}-01`);
  const prevWeekStart = toDbDate(addDays(weekStartOf(date), -7));
  const prev = addMonths(year, month, -1);
  const [entry, week, weekProjects, monthRow, monthProjects, prevWeek, prevMonth, grimoire] = await Promise.all([
    db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(date) } }, select: PROGRESS_SELECT }),
    db.week.findUnique({ where: { userId_startDate: { userId, startDate: weekStart } }, select: { intention: true, reflection: true } }),
    db.projectIntention.count({ where: { userId, period: 'WEEK', periodStart: weekStart } }),
    db.month.findUnique({ where: { userId_year_month: { userId, year, month } }, select: { intention: true, reflection: true } }),
    db.projectIntention.count({ where: { userId, period: 'MONTH', periodStart: monthStart } }),
    db.week.findUnique({ where: { userId_startDate: { userId, startDate: prevWeekStart } }, select: { reflection: true } }),
    db.month.findUnique({ where: { userId_year_month: { userId, year: prev.year, month: prev.month } }, select: { reflection: true } }),
    getGrimoireDayStatus(userId, locale, date),
  ]);
  return {
    day: computeDayProgress(date, entry),
    weekPlanDone: planMet(week?.intention ?? '', weekProjects),
    weekReflectionDone: reflectionMet(week?.reflection ?? ''),
    monthPlanDone: planMet(monthRow?.intention ?? '', monthProjects),
    monthReflectionDone: reflectionMet(monthRow?.reflection ?? ''),
    lastWeekReflectionDone: reflectionMet(prevWeek?.reflection ?? ''),
    lastMonthReflectionDone: reflectionMet(prevMonth?.reflection ?? ''),
    grimoire: { lessonsLeft: grimoire.lessonsLeft, quizPending: grimoire.quizPending },
  };
}

/** Título de uma leitura pessoal já gerada (na língua actual), para os convites. */
async function headline(userId: string, locale: Locale, kind: 'DAY_PERSONAL' | 'WEEK_PERSONAL' | 'MONTH_PERSONAL', periodStart: DateISO) {
  const row = await db.userAiContent.findUnique({
    where: { userId_kind_periodStart_locale: { userId, kind, periodStart: toDbDate(periodStart), locale } },
    select: { payload: true },
  });
  const parsed = row ? USER_SCHEMAS[kind].safeParse(row.payload) : null;
  return parsed?.success ? parsed.data.headline : undefined;
}

/** Contexto do texto: lua do dia, sabbat, ritual do mês marcado para hoje e títulos das leituras prontas. */
export async function notificationContext(
  userId: string,
  i: { locale: Locale; date: DateISO; tz: string; hemisphere: Hemisphere },
): Promise<NotificationContext> {
  const moon = getDailyMoon(i.date, i.tz);
  const sabbat = getSkyEvents(i.date, i.date, i.tz, i.hemisphere).find((e) => e.type === 'SABBAT');
  const monthStart = `${i.date.slice(0, 7)}-01`;
  const [rituals, dayHeadline, weekHeadline, monthHeadline] = await Promise.all([
    getRituals(userId, i.locale, monthStart).catch(() => null),
    headline(userId, i.locale, 'DAY_PERSONAL', i.date),
    headline(userId, i.locale, 'WEEK_PERSONAL', weekStartOf(i.date)),
    headline(userId, i.locale, 'MONTH_PERSONAL', monthStart),
  ]);
  return {
    locale: i.locale,
    date: i.date,
    tz: i.tz,
    moon: { phase: moon.phase, sign: moon.signAtNoon },
    sabbatToday: sabbat && sabbat.type === 'SABBAT' ? (sabbat.sabbat as SabbatKey) : undefined,
    ritualToday: rituals?.rituals.find((r) => r.date === i.date)?.title,
    dayHeadline,
    weekHeadline,
    monthHeadline,
    monthRituals: rituals?.rituals.length,
  };
}

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  url: string;
  sentAt: string; // ISO
  read: boolean;
}

export async function getInbox(userId: string, take = 30): Promise<InboxItem[]> {
  const rows = await db.notificationLog.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take,
    select: { id: true, title: true, body: true, url: true, sentAt: true, readAt: true },
  });
  return rows
    .filter((r) => r.title) // avisos anteriores à F7 não têm texto
    .map((r) => ({ id: r.id, title: r.title, body: r.body, url: r.url, sentAt: r.sentAt.toISOString(), read: r.readAt !== null }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notificationLog.count({ where: { userId, readAt: null, title: { not: '' } } });
}
