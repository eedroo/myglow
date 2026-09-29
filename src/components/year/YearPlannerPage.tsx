import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getYearPageData } from '@/lib/planner/queries';
import { MAX_YEARS_AHEAD, MIN_YEAR } from '@/lib/weeks';
import { PeriodStatsCard } from '@/components/period/PeriodStatsCard';
import { RetrogradesCard } from '@/components/period/RetrogradesCard';
import { WheelOfYearCard } from './WheelOfYearCard';
import { YearGrid } from './YearGrid';
import { YearMoodCard } from './YearMoodCard';
import { YearNav } from './YearNav';
import { YearPlanView } from './YearPlanView';
import { GlowWindowNote } from '@/components/glow/GlowWindowNote';
import { getPeriodAwards } from '@/lib/xp/queries';

/** Planner anual + grelha dos 12 meses, Roda do Ano, retrógrados, humor e estatísticas. */
export async function YearPlannerPage({ year }: { year: number }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true, hemisphere: true },
  });
  if (!user) redirect('/login');

  const yearStart = `${year}-01-01`;
  const [data, yearAwards] = await Promise.all([
    getYearPageData(session.user.id, year, user.timezone, user.hemisphere),
    getPeriodAwards(session.user.id, ['YEAR_PLAN', 'YEAR_REFLECTION'], yearStart),
  ]);
  const currentYear = Number(data.today.slice(0, 4));
  const href = (y: number) => (y === currentYear ? '/year' : `/year/${y}`);

  return (
    <YearPlanView
      key={year}
      initial={data.plan}
      slots={{
        nav: (
          <YearNav
            year={year}
            prevHref={year > MIN_YEAR ? href(year - 1) : null}
            nextHref={year < currentYear + MAX_YEARS_AHEAD ? href(year + 1) : null}
            isCurrent={year === currentYear}
          />
        ),
        grid: <YearGrid year={year} months={data.months} today={data.today} />,
        wheel: <WheelOfYearCard events={data.sky} today={data.today} timezone={user.timezone} />,
        retrogrades: <RetrogradesCard periods={data.retrogrades} today={data.today} />,
        mood: <YearMoodCard year={year} months={data.months.map((m) => m.stats)} />,
        glowNote: (
          <GlowWindowNote period="year" periodStart={yearStart} timezone={user.timezone} today={data.today} earned={yearAwards} />
        ),
        stats: data.stats.daysElapsed > 0 ? <PeriodStatsCard stats={data.stats} /> : null,
      }}
    />
  );
}
