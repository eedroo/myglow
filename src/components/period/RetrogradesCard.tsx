import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { compareDates, formatDayMonth, type DateISO } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { RetrogradePeriod } from '@/lib/astro/skyEvents';
import { PLANET_ICON } from './skyEventText';

interface RetrogradesCardProps {
  periods: RetrogradePeriod[];
  today: DateISO;
}

/** Períodos retrógrados que tocam o período; o activo hoje em destaque. */
export async function RetrogradesCard({ periods, today }: RetrogradesCardProps) {
  const [t, ta, rawLocale] = await Promise.all([getTranslations('sky.retro'), getTranslations('astro'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  return (
    <GlassCard title={t('title')}>
      {periods.length === 0 ? (
        <p>{t('none')}</p>
      ) : (
        <ul className="mg-retro">
          {periods.map((p) => {
            const active = compareDates(p.start, today) <= 0 && (p.end === null || compareDates(today, p.end) <= 0);
            return (
              <li key={`${p.planet}-${p.start}`} className={active ? 'mg-retro__item mg-retro__item--active' : 'mg-retro__item'}>
                <MagicIcon name={PLANET_ICON[p.planet]} size="md" decorative />
                <span>
                  {t('item', { planet: ta(`bodies.${p.planet}`) })}
                  <span className="mg-retro__range">
                    {p.end
                      ? t('range', { start: formatDayMonth(p.start, locale), end: formatDayMonth(p.end, locale) })
                      : t('since', { start: formatDayMonth(p.start, locale) })}
                  </span>
                  <span className="mg-retro__sign">{t('inSign', { sign: ta(`signs.${p.startSign}`) })}</span>
                </span>
                {active ? <span className="mg-retro__now">{t('now')}</span> : <span />}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
