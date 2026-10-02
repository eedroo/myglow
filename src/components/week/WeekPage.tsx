import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, formatDateRange, formatMonthName, type DateISO } from '@/lib/dates';
import { MAX_WEEKS_AHEAD, monthKey, weekStartOf, weeksBetween } from '@/lib/weeks';
import { getWeekPageData } from '@/lib/week/queries';
import { isAppLocale } from '@/i18n/locales';
import { WeekNav } from './WeekNav';
import { WeekSkyCard } from './WeekSkyCard';
import { WeekView } from './WeekView';
import { GlowWindowNote } from '@/components/glow/GlowWindowNote';
import { getPeriodAwards } from '@/lib/xp/queries';
import { getWeekReading } from '@/lib/ai/queries';
import { ensureNatalChart } from '@/lib/astro/ensureNatalChart';
import { WeekReadingCard } from '@/components/reading/WeekReadingCard';

/** Planner de uma semana (domingo → sábado). */
export async function WeekPage({ start }: { start: DateISO }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  const [data, t, rawLocale, weekAwards, reading, natal, ta] = await Promise.all([
    getWeekPageData(session.user.id, start, user.timezone),
    getTranslations('week'),
    getLocale(),
    getPeriodAwards(session.user.id, ['WEEK_PLAN', 'WEEK_REFLECTION'], start),
    getWeekReading(session.user.id, start),
    ensureNatalChart(session.user.id),
    getTranslations('astro'),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const { week } = data;

  const currentStart = weekStartOf(data.today);
  const next = addDays(start, 7);
  const focusNotes =
    reading.personal.status === 'ready'
      ? Object.fromEntries(reading.personal.data.focusAreas.map((f) => [f.area, f.note]))
      : undefined;
  const defaultTitle = t('defaultTitle', { n: week.weekOfMonth, month: formatMonthName(week.year, week.month, locale) });

  return (
    <>
      <WeekNav
        label={formatDateRange(start, addDays(start, 6), locale)}
        prevHref={addDays(start, -7) === currentStart ? '/week' : `/week/${addDays(start, -7)}`}
        nextHref={weeksBetween(currentStart, next) <= MAX_WEEKS_AHEAD ? (next === currentStart ? '/week' : `/week/${next}`) : null}
        isCurrent={start === currentStart}
        monthHref={`/month/${monthKey(week.year, week.month)}`}
      />
      <WeekView
        key={start}
        initial={week}
        days={data.days}
        previousWeightGrams={data.previousWeightGrams}
        wellbeing={data.wellbeing}
        defaultTitle={defaultTitle}
        glowNote={<GlowWindowNote period="week" periodStart={start} timezone={user.timezone} today={data.today} earned={weekAwards} />}
        sky={<WeekSkyCard events={data.moonEvents} moonDays={data.days.map((d) => d.moon)} timezone={user.timezone} />}
        reading={
          <WeekReadingCard
            energy={reading.energy}
            personal={reading.personal}
            pending={reading.pending}
            signLabel={natal ? ta(`signs.${natal.bodies.SUN.sign}`) : null}
            locale={locale}
          />
        }
        focusNotes={focusNotes}
      />
    </>
  );
}
