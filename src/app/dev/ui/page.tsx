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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dev');
  return { title: t('title'), robots: { index: false } };
}

/** Dados de exemplo: lua cheia em Lisboa e um nascimento com e sem hora. */
const SAMPLE_DATE = '2026-05-01';
const SAMPLE_TZ = 'Europe/Lisbon';
const sampleBirth = { latitude: 38.72, longitude: -9.14, birthDate: '1990-07-15', birthTz: SAMPLE_TZ };

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
  const phaseLabels = Object.fromEntries(MOON_PHASE_ORDER.map((p) => [p, ta(`phases.${p}`)])) as Record<MoonPhase, string>;
  const signLabels = Object.fromEntries(ZODIAC_ORDER.map((s) => [s, ta(`signs.${s}`)])) as Record<ZodiacSign, string>;

  return (
    <>
      <AmbientBackground />
      <UiShowcase icons={icons} />
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
      </div>
    </>
  );
}
