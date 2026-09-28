import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MOON_PHASE_ICON } from '@/components/ui/MoonPhaseStrip';
import { formatInstant } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { MoonEvent } from '@/lib/astro/moonCalendar';

/** Fases principais do mês com signo, dia e hora no fuso do utilizador. */
export async function MonthMoonCard({ events, timezone }: { events: MoonEvent[]; timezone: string }) {
  const [t, ta, rawLocale] = await Promise.all([getTranslations('month.moon'), getTranslations('astro'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  return (
    <GlassCard title={t('title')}>
      {events.length === 0 ? (
        <p>{t('none')}</p>
      ) : (
        <ul className="mg-month-moon">
          {events.map((e) => (
            <li key={e.at} className="mg-month-moon__item">
              <MagicIcon name={MOON_PHASE_ICON[e.phase]} size="md" decorative />
              <span>
                {t('event', { phase: ta(`phases.${e.phase}`), sign: ta(`signs.${e.sign}`) })}
                <time className="mg-month-moon__when" dateTime={e.at}>
                  {formatInstant(e.at, timezone, locale, 'date')}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
