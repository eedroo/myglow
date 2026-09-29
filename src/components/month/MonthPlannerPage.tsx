import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { formatMonthYear } from '@/lib/dates';
import { MAX_MONTHS_AHEAD, addMonths, monthKey, monthOf, weekStartOf } from '@/lib/weeks';
import { getDailyMoon } from '@/lib/astro/moon';
import { getMonthPageData } from '@/lib/planner/queries';
import { isAppLocale } from '@/i18n/locales';
import { PeriodStatsCard } from '@/components/period/PeriodStatsCard';
import { RetrogradesCard } from '@/components/period/RetrogradesCard';
import { RitualsTeaserCard } from '@/components/period/RitualsTeaserCard';
import { SkyEventsCard } from '@/components/period/SkyEventsCard';
import { MonthCalendar } from './MonthCalendar';
import { MonthHeroCard } from './MonthHeroCard';
import { MonthNav } from './MonthNav';
import { MonthPlanView } from './MonthPlanView';
import { MonthWeeksList } from './MonthWeeksList';
import { GlowWindowNote } from '@/components/glow/GlowWindowNote';
import { getPeriodAwards } from '@/lib/xp/queries';

/** Planner mensal (intenção, metas, reflexão) + calendário, céu, retrógrados, semanas e estatísticas. */
export async function MonthPlannerPage({ year, month }: { year: number; month: number }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true, hemisphere: true },
  });
  if (!user) redirect('/login');

  const monthStart = `${monthKey(year, month)}-01`;
  const [data, tsky, rawLocale, monthAwards] = await Promise.all([
    getMonthPageData(session.user.id, year, month, user.timezone, user.hemisphere),
    getTranslations('sky'),
    getLocale(),
    getPeriodAwards(session.user.id, ['MONTH_PLAN', 'MONTH_REFLECTION'], monthStart),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const { overview } = data;

  const current = monthOf(overview.today);
  const key = (m: { year: number; month: number }) => monthKey(m.year, m.month);
  const href = (m: { year: number; month: number }) => (key(m) === key(current) ? '/month' : `/month/${key(m)}`);
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const limit = key(addMonths(current.year, current.month, MAX_MONTHS_AHEAD));
  const isCurrent = key({ year, month }) === key(current);
  const currentWeekStart = weekStartOf(overview.today);
  const title = formatMonthYear(year, month, locale);

  return (
    <MonthPlanView
      key={key({ year, month })}
      initial={data.plan}
      slots={{
        nav: (
          <MonthNav
            label={title}
            prevHref={prev.year >= 2000 ? href(prev) : null}
            nextHref={key(next) <= limit ? href(next) : null}
            isCurrent={isCurrent}
            yearHref={year === current.year ? '/year' : `/year/${year}`}
            hideLabel
          />
        ),
        hero: (
          <MonthHeroCard
            title={title}
            sunSigns={data.sunSigns}
            moonToday={isCurrent ? getDailyMoon(overview.today, user.timezone) : null}
          />
        ),
        calendar: <MonthCalendar overview={overview} currentWeekStart={currentWeekStart} />,
        sky: <SkyEventsCard title={tsky('title')} events={data.sky} timezone={user.timezone} />,
        retrogrades: <RetrogradesCard periods={data.retrogrades} today={overview.today} />,
        weeks: <MonthWeeksList year={year} month={month} weeks={overview.weeks} currentWeekStart={currentWeekStart} />,
        stats: data.isFuture ? null : <PeriodStatsCard stats={data.stats} />,
        rituals: <RitualsTeaserCard />,
        glowNote: (
          <GlowWindowNote period="month" periodStart={monthStart} timezone={user.timezone} today={overview.today} earned={monthAwards} />
        ),
      }}
    />
  );
}
