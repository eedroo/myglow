import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatInstant } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { SkyEvent } from '@/lib/astro/skyEvents';
import { skyEventIcon, skyEventText, skyEventVariant, type Translate } from './skyEventText';

interface SkyEventsCardProps {
  title: string;
  events: SkyEvent[];
  timezone: string;
}

/** Lista cronológica do céu com data e hora no fuso do utilizador. */
export async function SkyEventsCard({ title, events, timezone }: SkyEventsCardProps) {
  const [t, ta, rawLocale] = await Promise.all([getTranslations('sky'), getTranslations('astro'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  return (
    <GlassCard title={title}>
      {events.length === 0 ? (
        <p>{t('none')}</p>
      ) : (
        <ul className="mg-sky-events">
          {events.map((e) => (
            <li key={`${e.type}-${e.at}`} className={`mg-sky-events__item mg-sky-events__item--${skyEventVariant(e)}`}>
              <span className="mg-sky-events__icon">
                <MagicIcon name={skyEventIcon(e)} size="md" decorative />
              </span>
              <span className="mg-sky-events__text">
                {skyEventText(e, t as Translate, ta as Translate)}
                <time className="mg-sky-events__when" dateTime={e.at}>
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
