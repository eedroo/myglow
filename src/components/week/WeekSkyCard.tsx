import type { MoonPhase } from '@prisma/client';
import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MOON_PHASE_ICON } from '@/components/ui/MoonPhaseStrip';
import { formatInstant } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { MoonDay, MoonEvent } from '@/lib/astro/moonCalendar';

interface WeekSkyCardProps {
  events: MoonEvent[];
  moonDays: MoonDay[];
  timezone: string;
}

/** Fase mais frequente da semana (quando não há fases principais). */
function dominantPhase(days: MoonDay[]): MoonPhase {
  const counts = new Map<MoonPhase, number>();
  for (const d of days) counts.set(d.phase, (counts.get(d.phase) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

/** Eventos lunares da semana, com hora no fuso do utilizador. */
export async function WeekSkyCard({ events, moonDays, timezone }: WeekSkyCardProps) {
  const [t, ta, rawLocale] = await Promise.all([getTranslations('week.sky'), getTranslations('astro'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  return (
    <GlassCard className="mg-week-sky">
      <h2 className="mg-week-sky__title">
        <MagicIcon name="moon-stars" size="sm" decorative />
        {t('title')}
      </h2>
      {events.length > 0 ? (
        <ul className="mg-week-sky__list">
          {events.map((e) => (
            <li key={e.at} className="mg-week-sky__event">
              <MagicIcon name={MOON_PHASE_ICON[e.phase]} size="sm" decorative />
              <span>
                {t('event', { phase: ta(`phases.${e.phase}`), sign: ta(`signs.${e.sign}`) })}
                {' · '}
                <time className="mg-week-sky__when" dateTime={e.at}>
                  {formatInstant(e.at, timezone, locale, 'weekday')}
                </time>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        moonDays.length > 0 && (
          <p className="mg-week-sky__event">
            <MagicIcon name={MOON_PHASE_ICON[dominantPhase(moonDays)]} size="sm" decorative />
            {t('dominant', { phase: ta(`phases.${dominantPhase(moonDays)}`) })}
          </p>
        )
      )}
    </GlassCard>
  );
}
