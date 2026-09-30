import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { UiShowcase } from '@/components/dev/UiShowcase';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { MAGIC_ICONS, MAGIC_ICON_NAMES } from '@/lib/icons';
import type { MoonPhase, ZodiacSign } from '@prisma/client';
import { getLocale } from 'next-intl/server';
import { DailySkyCard } from '@/components/day/DailySkyCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DateBadge } from '@/components/ui/DateBadge';
import { MOON_PHASE_ORDER, MoonPhaseStrip } from '@/components/ui/MoonPhaseStrip';
import { ZodiacStrip } from '@/components/ui/ZodiacStrip';
import { getDailySky } from '@/lib/astro/sky';
import { computeNatalChart } from '@/lib/astro/natal';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { toBirthUtc } from '@/lib/birth';
import { formatLongDate } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import { MonthCalendar } from '@/components/month/MonthCalendar';
import { getMoonCalendar } from '@/lib/astro/moonCalendar';
import { computeDayProgress, type ProgressEntry } from '@/lib/daily/progress';
import { addDays, compareDates } from '@/lib/dates';
import { monthGrid, weekDays } from '@/lib/weeks';
import type { WeekDaySummary } from '@/types/week';
import { getRetrogradePeriods, getSkyEvents } from '@/lib/astro/skyEvents';
import { computePeriodStats, computeYearMonthly, type DailyEntryLike } from '@/lib/stats/period';
import { PeriodStatsCard } from '@/components/period/PeriodStatsCard';
import { RetrogradesCard } from '@/components/period/RetrogradesCard';
import { SkyEventsCard } from '@/components/period/SkyEventsCard';
import { YearMonthTile } from '@/components/year/YearMonthTile';
import { YearMoodCard } from '@/components/year/YearMoodCard';
import { formatMonthName } from '@/lib/dates';
import { GlowWindowNote } from '@/components/glow/GlowWindowNote';
import { LevelBadge } from '@/components/glow/LevelBadge';
import { LevelPathCard } from '@/components/journey/LevelPathCard';
import { StreakCard } from '@/components/journey/StreakCard';
import { DailyReadingCard } from '@/components/reading/DailyReadingCard';
import { MonthReadingCard } from '@/components/reading/MonthReadingCard';
import { RitualsCard } from '@/components/reading/RitualsCard';
import { RitualTodayCard } from '@/components/reading/RitualTodayCard';
import { InstallGuide } from '@/components/notifications/InstallGuide';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { NotificationsPromptCard } from '@/components/notifications/NotificationsPromptCard';
import { buildNotification } from '@/lib/notifications/content';
import { dayHoroscopeSchema, dayPersonalSchema, monthRitualsSchema } from '@/lib/ai/schemas';
import { finalizeRituals } from '@/lib/ai/rituals';
import sampleHoroscope from '../../../../tests/fixtures/ai/day-horoscope.valid.json';
import samplePersonal from '../../../../tests/fixtures/ai/day-personal.valid.json';
import sampleRituals from '../../../../tests/fixtures/ai/month-rituals.valid.json';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dev');
  return { title: t('title'), robots: { index: false } };
}

/** Dados de exemplo: lua cheia em Lisboa e um nascimento com e sem hora. */
const SAMPLE_DATE = '2026-05-01';
const SAMPLE_TZ = 'Europe/Lisbon';
const sampleBirth = { latitude: 38.72, longitude: -9.14, birthDate: '1990-07-15', birthTz: SAMPLE_TZ };

/** Entradas de exemplo: vazio, parcial e completo a alternar; "hoje" é 2026-05-06. */
const SAMPLE_TODAY = '2026-05-06';
const sampleEntry = (i: number): ProgressEntry | null => {
  const blank: ProgressEntry = {
    intention: null, morningBanishName: null, morningBanishDone: false, morningRitualDone: false, sleepGoalMet: false,
    wakeMood: null, wakeNote: null, stretchDone: false, workoutDone: false, waterDone: false,
    nightBanishName: null, nightBanishDone: false, nightRitualDone: false, gratitude: null, mood: null,
    reflection: null, summary: null,
  };
  if (i % 3 === 0) return null;
  if (i % 3 === 1) return { ...blank, intention: 'x', morningBanishDone: true, morningRitualDone: true, wakeMood: 4, waterDone: true };
  return {
    ...blank, intention: 'x', morningBanishDone: true, morningRitualDone: true, wakeMood: 4,
    stretchDone: true, workoutDone: true, waterDone: true,
    nightBanishDone: true, nightRitualDone: true, gratitude: 'x', mood: 5, reflection: 'x',
  };
};

function sampleDay(date: string, i: number) {
  const future = compareDates(date, SAMPLE_TODAY) > 0;
  return {
    progress: computeDayProgress(date, future ? null : sampleEntry(i)),
    isToday: date === SAMPLE_TODAY,
    isFuture: future,
  };
}

export default async function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const icons = MAGIC_ICON_NAMES.map((name) => ({ name, ready: MAGIC_ICONS[name].ready }));
  const [t, ta, td, locale] = await Promise.all([
    getTranslations('dev'),
    getTranslations('astro'),
    getTranslations('day'),
    getLocale(),
  ]);
  const sky = getDailySky(SAMPLE_DATE, SAMPLE_TZ);
  const withTime = computeNatalChart({ ...sampleBirth, birthUtc: toBirthUtc('1990-07-15', '14:30', SAMPLE_TZ), timeKnown: true });
  const withoutTime = computeNatalChart({ ...sampleBirth, birthUtc: toBirthUtc('1990-07-15', null, SAMPLE_TZ), timeKnown: false });
  const moonMay = getMoonCalendar('2026-05-01', '2026-05-31', SAMPLE_TZ);
  const sampleWeek: WeekDaySummary[] = weekDays('2026-05-03').map((date, i) => ({
    date,
    moon: moonMay[date]!,
    ...sampleDay(date, i),
  }));
  const monthDays: Record<string, ReturnType<typeof sampleDay> & { moon: (typeof moonMay)[string] }> = {};
  for (let d = '2026-05-01', i = 0; d <= '2026-05-31'; d = addDays(d, 1), i++) {
    monthDays[d] = { ...sampleDay(d, i), moon: moonMay[d]! };
  }

  // Mês e ano de exemplo (céu calculado, entradas fictícias; sem DB).
  const sampleEntries: DailyEntryLike[] = [];
  for (let d = '2026-01-01', i = 0; d <= SAMPLE_TODAY; d = addDays(d, 1), i++) {
    const e = sampleEntry(i);
    if (e) sampleEntries.push({ ...e, date: d, mood: (i % 5) + 1, wakeMood: ((i + 2) % 5) + 1 });
  }
  const maySky = getSkyEvents('2026-05-01', '2026-05-31', SAMPLE_TZ, 'NORTH');
  const eventDays: Record<string, typeof maySky> = {};
  for (const e of maySky) if (e.type === 'SABBAT' || e.type === 'SEASON' || e.type.endsWith('ECLIPSE') || e.type === 'STATION') (eventDays[e.date] ??= []).push(e);
  const julyRetro = getRetrogradePeriods('2026-06-01', '2026-07-31', SAMPLE_TZ);
  const mayStats = computePeriodStats({
    from: '2026-05-01',
    to: '2026-05-31',
    today: '2026-05-31',
    entries: sampleEntries,
    weeks: [
      { startDate: '2026-05-03', weightGrams: 76_400 },
      { startDate: '2026-05-10', weightGrams: 76_100 },
      { startDate: '2026-05-17', weightGrams: 76_250 },
      { startDate: '2026-05-24', weightGrams: 75_900 },
    ],
  });
  const yearMonthly = computeYearMonthly(2026, SAMPLE_TODAY, sampleEntries);
  const mayLevels = Object.fromEntries(
    sampleEntries.filter((e) => e.date.startsWith('2026-05')).map((e) => [e.date, computeDayProgress(e.date, e).level]),
  );

  // Leituras IA de exemplo (fixtures dos testes, validadas pelos esquemas).
  const appLocale = isAppLocale(locale) ? locale : 'pt-PT';
  const rituals = finalizeRituals(monthRitualsSchema.parse(sampleRituals));
  const ready = <T,>(data: T) => ({ status: 'ready' as const, data });

  // Avisos de exemplo (texto real de `buildNotification`, sem DB).
  const dbLocale = appLocale === 'pt-BR' ? 'PT_BR' : appLocale === 'en' ? 'EN' : 'PT_PT';
  const sampleCtx = { locale: dbLocale, date: SAMPLE_DATE, tz: SAMPLE_TZ, moon: { phase: sky.moon.phase, sign: sky.moon.signAtNoon } } as const;
  const sampleInbox = (['MORNING', 'BODY', 'WEEK_START'] as const).map((kind, i) => ({
    id: `dev-${kind}`,
    ...buildNotification(kind, sampleCtx),
    sentAt: new Date(Date.now() - (i + 1) * 3 * 3_600_000).toISOString(),
    read: i === 2,
  }));

  const phaseLabels = Object.fromEntries(MOON_PHASE_ORDER.map((p) => [p, ta(`phases.${p}`)])) as Record<MoonPhase, string>;
  const signLabels = Object.fromEntries(ZODIAC_ORDER.map((s) => [s, ta(`signs.${s}`)])) as Record<ZodiacSign, string>;

  return (
    <>
      <AmbientBackground />
      <UiShowcase icons={icons} sampleWeek={sampleWeek} />
      <div className="mg-dev">
        <section className="mg-stack">
          <SectionHeader title={t('daily')} icon="moon-stars" />
          <GlassCard>
            <MoonPhaseStrip phase={sky.moon.phase} labels={phaseLabels} label={td('header.phases')} />
            <ZodiacStrip sign={sky.moon.signAtNoon} labels={signLabels} label={td('header.signs')} />
            <DateBadge date={SAMPLE_DATE} label={formatLongDate(SAMPLE_DATE, isAppLocale(locale) ? locale : 'pt-PT')} />
          </GlassCard>
          <p className="mg-dev__caption">{t('withTime')}</p>
          <DailySkyCard sky={sky} natal={withTime} isToday />
          <p className="mg-dev__caption">{t('withoutTime')}</p>
          <DailySkyCard sky={sky} natal={withoutTime} isToday={false} />
        </section>
        <section className="mg-stack">
          <SectionHeader title={t('monthSample')} icon="moon-stars" />
          <MonthCalendar
            overview={{ grid: monthGrid(2026, 5), days: monthDays, today: SAMPLE_TODAY, eventDays }}
            currentWeekStart="2026-05-03"
          />
        </section>
        <section className="mg-stack">
          <SectionHeader title={t('plannerSample')} icon="zodiac-wheel" />
          <div className="mg-dev__grid">
            <SkyEventsCard title={ta('bodies.MOON')} events={maySky} timezone={SAMPLE_TZ} />
            <RetrogradesCard periods={julyRetro} today="2026-07-10" />
          </div>
          <PeriodStatsCard stats={mayStats} />
          <div className="mg-dev__grid">
            <YearMonthTile
              year={2026}
              name={formatMonthName(2026, 5, isAppLocale(locale) ? locale : 'pt-PT')}
              today={SAMPLE_TODAY}
              href="/month/2026-05"
              summary={{ month: 5, intention: '—', stats: yearMonthly[4]!, levels: mayLevels, isFuture: false, isCurrent: true }}
            />
          </div>
          <YearMoodCard year={2026} months={yearMonthly} />
        </section>
        <section className="mg-stack">
          <SectionHeader title={t('readingSample')} icon="crystal-ball" />
          <DailyReadingCard
            horoscope={ready(dayHoroscopeSchema.parse(sampleHoroscope))}
            personal={ready(dayPersonalSchema.parse(samplePersonal))}
            pending={[]}
            signLabel={ta('signs.CANCER')}
          />
          <RitualTodayCard ritual={rituals.rituals[0]!} locale={appLocale} />
          <p className="mg-dev__caption">{t('readingPending')}</p>
          <MonthReadingCard
            energy={{ status: 'pending' }}
            personal={{ status: 'pending' }}
            pending={[]}
            signLabel={ta('signs.CANCER')}
            locale={appLocale}
          />
          <RitualsCard rituals={ready(rituals)} pending={[]} year={2026} month={5} locale={appLocale} />
        </section>
        <section className="mg-stack">
          <SectionHeader title={t('notificationsSample')} icon="moon-stars" />
          <GlassCard>
            <div className="mg-row">
              <NotificationInbox items={sampleInbox} unread={2} />
              <NotificationInbox items={[]} unread={0} />
            </div>
          </GlassCard>
          <NotificationsPromptCard />
          <GlassCard>
            <InstallGuide />
          </GlassCard>
          <GlassCard>
            <NotificationSettings
              initial={{
                enabled: true, morningEnabled: true, bodyEnabled: true, nightEnabled: false,
                morningTime: '08:00', bodyTime: '13:00', nightTime: '21:30',
                weekStart: true, weekEnd: true, monthStart: true, monthEnd: false,
              }}
              devices={[{ endpoint: 'https://push.example.com/dev', userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/128.0', createdAt: '2026-05-01T10:00:00Z' }]}
              pushConfigured={false}
            />
          </GlassCard>
        </section>
        <section className="mg-stack">
          <SectionHeader title={t('glowSample')} icon="glow-orb" />
          <GlassCard>
            <div className="mg-row">
              {[0, 450, 1600, 15000].map((total) => (
                <LevelBadge key={total} total={total} />
              ))}
            </div>
            {/* Estados da nota de janela, com "agora" fixo */}
            <GlowWindowNote period="day" periodStart="2026-05-06" timezone={SAMPLE_TZ} today="2026-05-06" earned={['DAY_MORNING', 'DAY_BODY']} now={new Date('2026-05-06T12:00:00Z')} />
            <GlowWindowNote period="day" periodStart="2026-05-05" timezone={SAMPLE_TZ} today="2026-05-06" earned={[]} now={new Date('2026-05-06T12:00:00Z')} />
            <GlowWindowNote period="day" periodStart="2026-05-01" timezone={SAMPLE_TZ} today="2026-05-06" earned={[]} now={new Date('2026-05-06T12:00:00Z')} />
            <GlowWindowNote period="day" periodStart="2026-05-02" timezone={SAMPLE_TZ} today="2026-05-06" earned={['DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'DAY_COMPLETE']} now={new Date('2026-05-06T12:00:00Z')} />
            <GlowWindowNote period="week" periodStart="2026-05-03" timezone={SAMPLE_TZ} today="2026-05-04" earned={[]} now={new Date('2026-05-04T12:00:00Z')} />
            <GlowWindowNote period="week" periodStart="2026-05-03" timezone={SAMPLE_TZ} today="2026-05-09" earned={['WEEK_PLAN']} now={new Date('2026-05-09T12:00:00Z')} />
            <GlowWindowNote period="month" periodStart="2026-05-01" timezone={SAMPLE_TZ} today="2026-05-20" earned={[]} now={new Date('2026-05-20T12:00:00Z')} />
            <GlowWindowNote period="year" periodStart="2027-01-01" timezone={SAMPLE_TZ} today="2026-12-20" earned={[]} now={new Date('2026-12-20T12:00:00Z')} />
          </GlassCard>
          <LevelPathCard total={1600} />
          <div className="mg-dev__grid">
            <StreakCard current={4} best={12} />
            <StreakCard current={0} best={12} />
          </div>
        </section>
      </div>
    </>
  );
}
