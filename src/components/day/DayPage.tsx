import type { MoonPhase, ZodiacSign } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, compareDates, formatLongDate, formatMonthName, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
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
import { DayPlanNote } from './DayPlanNote';
import { DayView } from './DayView';
import { GlowWindowNote } from '@/components/glow/GlowWindowNote';
import { getPeriodAwards } from '@/lib/xp/queries';
import { getDayReading } from '@/lib/ai/queries';
import { DailyReadingCard } from '@/components/reading/DailyReadingCard';
import { RitualTodayCard } from '@/components/reading/RitualTodayCard';
import { NotificationsPromptCard } from '@/components/notifications/NotificationsPromptCard';
import { PROMPT_DISMISS_COOKIE, shouldShowPrompt } from '@/lib/notifications/prompt';
import { DAY_SOURCES } from '@/lib/xp/rules';
import { FirstStepsCard } from '@/components/welcome/FirstStepsCard';

/** Página de um dia do diário (hoje ou passado). */
export async function DayPage({ date }: { date: DateISO }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  const [user, entry, natal, locale, ta, td, dayAwards, reading, planNote] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { timezone: true, sleepGoalMinutes: true, createdAt: true, wellbeingConsentAt: true } }),
    getDailyEntry(userId, date),
    ensureNatalChart(userId),
    getLocale(),
    getTranslations('astro'),
    getTranslations('day'),
    getPeriodAwards(userId, [...DAY_SOURCES], date),
    getDayReading(userId, date),
    // O que ficou escrito para este dia no planner da Semana.
    db.weekDayNote.findFirst({ where: { date: toDbDate(date), week: { userId } }, select: { text: true } }),
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
      {isToday && <FirstStepsCard userId={userId} today={today} />}
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
      <DailyReadingCard personal={reading.personal} pending={reading.pending} />
      {reading.ritualToday && <RitualTodayCard ritual={reading.ritualToday} locale={appLocale} />}
      {shouldShowPrompt({
        firstDay: todayInTz(user.timezone, user.createdAt),
        today,
        isToday,
        dismissed: cookies().has(PROMPT_DISMISS_COOKIE),
      }) && <NotificationsPromptCard />}
      <DayView
        key={date}
        date={date}
        initial={entry}
        sleepGoalMinutes={user.sleepGoalMinutes}
        wellbeing={!!user.wellbeingConsentAt}
        planNote={planNote?.text.trim() ? <DayPlanNote text={planNote.text.trim()} weekHref={weekChip.href} /> : undefined}
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
