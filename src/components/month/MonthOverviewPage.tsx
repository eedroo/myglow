import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { formatMonthYear } from '@/lib/dates';
import { MAX_MONTHS_AHEAD, addMonths, monthKey, monthOf, weekStartOf } from '@/lib/weeks';
import { getMonthOverview } from '@/lib/month/overview';
import { isAppLocale } from '@/i18n/locales';
import { MonthCalendar } from './MonthCalendar';
import { MonthMoonCard } from './MonthMoonCard';
import { MonthNav } from './MonthNav';
import { MonthPlannerTeaser } from './MonthPlannerTeaser';
import { MonthWeeksList } from './MonthWeeksList';

/** Vista de navegação do mês (o planner mensal chega na Fase 4). */
export async function MonthOverviewPage({ year, month }: { year: number; month: number }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  const [overview, rawLocale] = await Promise.all([
    getMonthOverview(session.user.id, year, month, user.timezone),
    getLocale(),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  const current = monthOf(overview.today);
  const key = (m: { year: number; month: number }) => monthKey(m.year, m.month);
  const href = (m: { year: number; month: number }) => (key(m) === key(current) ? '/month' : `/month/${key(m)}`);
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const limit = key(addMonths(current.year, current.month, MAX_MONTHS_AHEAD));
  const currentWeekStart = weekStartOf(overview.today);

  return (
    <div className="mg-month">
      <MonthNav
        label={formatMonthYear(year, month, locale)}
        prevHref={prev.year >= 2000 ? href(prev) : null}
        nextHref={key(next) <= limit ? href(next) : null}
        isCurrent={key({ year, month }) === key(current)}
      />
      <MonthCalendar overview={overview} currentWeekStart={currentWeekStart} />
      <div className="mg-month__grid">
        <MonthWeeksList year={year} month={month} weeks={overview.weeks} currentWeekStart={currentWeekStart} />
        <MonthMoonCard events={overview.moonEvents} timezone={user.timezone} />
      </div>
      <MonthPlannerTeaser />
    </div>
  );
}
