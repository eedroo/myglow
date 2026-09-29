import type { MoonPhase, ZodiacSign } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, compareDates, formatLongDate, formatMonthName, todayInTz, type DateISO } from '@/lib/dates';
import { weekKey, weekStartOf } from '@/lib/weeks';
import { getDailySky } from '@/lib/astro/sky';
import { ensureNatalChart } from '@/lib/astro/ensureNatalChart';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { getDailyEntry } from '@/lib/daily/queries';
import { getDayPeriod } from '@/lib/daily/period';
import { isAppLocale } from '@/i18n/locales';
import { MOON_PHASE_ORDER } from '@/components/ui/MoonPhaseStrip';
import { DailyHeader } from './DailyHeader';
import { DailySkyCard } from './DailySkyCard';
import { DayNav } from './DayNav';
import { DayView } from './DayView';
import { GlowWindowNote } from '@/components/glow/GlowWindowNote';
import { getPeriodAwards } from '@/lib/xp/queries';
import { getDayReading } from '@/lib/ai/queries';
import { DailyReadingCard } from '@/components/reading/DailyReadingCard';
import { RitualTodayCard } from '@/components/reading/RitualTodayCard';
import { DAY_SOURCES } from '@/lib/xp/rules';

/** Página de um dia do diário (hoje ou passado). */
export async function DayPage({ date }: { date: DateISO }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  const [user, entry, natal, locale, ta, td, dayAwards, reading] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { timezone: true, sleepGoalMinutes: true } }),
    getDailyEntry(userId, date),
    ensureNatalChart(userId),
    getLocale(),
    getTranslations('astro'),
    getTranslations('day'),
    getPeriodAwards(userId, [...DAY_SOURCES], date),
    getDayReading(userId, date),
  ]);
  if (!user) redirect('/login');

  const today = todayInTz(user.timezone);
  const isToday = compareDates(date, today) === 0;
  const sky = getDailySky(date, user.timezone);
  const appLocale = isAppLocale(locale) ? locale : 'pt-PT';
  const longDate = formatLongDate(date, appLocale);
  const personal = reading.personal.status === 'ready' ? reading.personal.data : null;

  const week = weekKey(weekStartOf(date));
  const weekChip = {
    label: (await getTranslations('week'))('chip', {
      n: week.weekOfMonth,
      month: formatMonthName(week.year, week.month, isAppLocale(locale) ? locale : 'pt-PT'),
    }),
    href: week.start === weekStartOf(today) ? '/week' : `/week/${week.start}`,
  };

  const phaseLabels = Object.fromEntries(MOON_PHASE_ORDER.map((p) => [p, ta(`phases.${p}`)])) as Record<MoonPhase, string>;
  const signLabels = Object.fromEntries(ZODIAC_ORDER.map((s) => [s, ta(`signs.${s}`)])) as Record<ZodiacSign, string>;

  return (
    <>
      <DayNav
        label={longDate}
        prevHref={`/day/${addDays(date, -1)}`}
        nextHref={isToday ? null : compareDates(addDays(date, 1), today) === 0 ? '/today' : `/day/${addDays(date, 1)}`}
        isToday={isToday}
      />
      <DailyHeader
        date={date}
        dateLabel={longDate}
        phase={sky.moon.phase}
        moonSign={sky.moon.signAtNoon}
        phaseLabels={phaseLabels}
        signLabels={signLabels}
        phasesLabel={td('header.phases')}
        signsLabel={td('header.signs')}
        week={weekChip}
        glowNote={<GlowWindowNote period="day" periodStart={date} timezone={user.timezone} today={today} earned={dayAwards} />}
      />
      <DailySkyCard sky={sky} natal={natal} isToday={isToday} />
      <DailyReadingCard
        horoscope={reading.horoscope}
        personal={reading.personal}
        pending={reading.pending}
        signLabel={natal ? ta(`signs.${natal.bodies.SUN.sign}`) : null}
      />
      {reading.ritualToday && <RitualTodayCard ritual={reading.ritualToday} locale={appLocale} />}
      <DayView
        key={date}
        date={date}
        initial={entry}
        sleepGoalMinutes={user.sleepGoalMinutes}
        currentPeriod={isToday ? getDayPeriod(new Date(), user.timezone) : null}
        suggestions={
          personal
            ? { intention: personal.intentionSuggestion, banish: personal.banishSuggestion, reflection: personal.reflectionQuestion }
            : undefined
        }
      />
    </>
  );
}
