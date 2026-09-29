import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { compareDates, formatInstant, type DateISO } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { SkyEvent } from '@/lib/astro/skyEvents';
import { skyEventIcon, skyEventText, type Translate } from '@/components/period/skyEventText';

interface WheelOfYearCardProps {
  events: SkyEvent[]; // SABBAT, SEASON e eclipses do ano
  today: DateISO;
  timezone: string;
}

/** Roda do Ano: 8 sabbats + 4 estações por ordem, o próximo destacado; eclipses do ano. */
export async function WheelOfYearCard({ events, today, timezone }: WheelOfYearCardProps) {
  const [t, tsky, ta, rawLocale] = await Promise.all([
    getTranslations('year.wheel'),
    getTranslations('sky'),
    getTranslations('astro'),
    getLocale(),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  const wheel = events.filter((e) => e.type === 'SABBAT' || e.type === 'SEASON');
  const eclipses = events.filter((e) => e.type === 'LUNAR_ECLIPSE' || e.type === 'SOLAR_ECLIPSE');
  const nextAt = wheel.find((e) => compareDates(e.date, today) >= 0)?.at;

  return (
    <GlassCard title={t('title')}>
      <ol className="mg-wheel__list">
        {wheel.map((e) => {
          const past = compareDates(e.date, today) < 0;
          const isNext = e.at === nextAt;
          const classes = ['mg-wheel__item', past && 'mg-wheel__item--past', isNext && 'mg-wheel__item--next']
            .filter(Boolean)
            .join(' ');
          const [name, sub] =
            e.type === 'SABBAT'
              ? [tsky(`sabbats.${e.sabbat}.name`), tsky(`sabbats.${e.sabbat}.subtitle`)]
              : [skyEventText(e, tsky as Translate, ta as Translate), null];
          return (
            <li key={`${e.type}-${e.at}`} className={classes} aria-current={isNext ? 'true' : undefined}>
              <MagicIcon name={skyEventIcon(e)} size="md" decorative />
              <span>
                <span className="mg-wheel__name">
                  {name}
                  {isNext && <span className="mg-wheel__badge">{t('next')}</span>}
                </span>
                {sub && <span className="mg-wheel__sub">{sub}</span>}
                <time className="mg-wheel__when" dateTime={e.at}>
                  {formatInstant(e.at, timezone, locale, 'date')}
                </time>
              </span>
            </li>
          );
        })}
      </ol>
      {eclipses.length > 0 && (
        <div className="mg-wheel__eclipses">
          <h3 className="mg-wheel__eclipses-title">{t('eclipses')}</h3>
          <ol className="mg-wheel__list">
            {eclipses.map((e) => (
              <li
                key={e.at}
                className={compareDates(e.date, today) < 0 ? 'mg-wheel__item mg-wheel__item--past' : 'mg-wheel__item'}
              >
                <MagicIcon name={skyEventIcon(e)} size="md" decorative />
                <span>
                  <span className="mg-wheel__name">{skyEventText(e, tsky as Translate, ta as Translate)}</span>
                  <time className="mg-wheel__when" dateTime={e.at}>
                    {formatInstant(e.at, timezone, locale, 'date')}
                  </time>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </GlassCard>
  );
}
