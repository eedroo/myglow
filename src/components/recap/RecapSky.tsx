'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDayMonth } from '@/lib/dates';
import type { SkyEvent } from '@/lib/astro/skyEvents';
import { PLANET_ICON, skyEventIcon, skyEventText, type Translate } from '@/components/period/skyEventText';
import type { RecapSlideProps } from './RecapSlideView';

/** O céu do período: fases da lua (+ eclipses, ingressos, sabbats e retrógrados no mês). */
export function RecapSky({ slide, kind, locale }: RecapSlideProps<'sky'>) {
  const t = useTranslations('recap.sky');
  const tsky = useTranslations('sky');
  const tr = useTranslations('sky.retro');
  const ta = useTranslations('astro');
  const events: SkyEvent[] = [
    ...slide.moonEvents.map((m): SkyEvent => ({ type: 'MOON_PHASE', phase: m.phase, sign: m.sign, at: m.at, date: m.date })),
    ...slide.skyEvents,
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="mg-recap-sky">
      <h2 className="mg-recap-slide__title">{t(kind === 'WEEK' ? 'titleWeek' : 'titleMonth')}</h2>
      <ul className="mg-recap-list">
        {events.map((e) => (
          <li key={`${e.type}-${e.at}`} className="mg-recap-list__item">
            <MagicIcon name={skyEventIcon(e)} size="md" decorative />
            <span className="mg-recap-list__label">
              {skyEventText(e, tsky as Translate, ta as Translate)}
              <time className="mg-recap-list__when" dateTime={e.date}>
                {formatDayMonth(e.date, locale)}
              </time>
            </span>
          </li>
        ))}
        {slide.retrogrades.map((r) => (
          <li key={`${r.planet}-${r.start}`} className="mg-recap-list__item">
            <MagicIcon name={PLANET_ICON[r.planet]} size="md" decorative />
            <span className="mg-recap-list__label">
              {tr('item', { planet: ta(`bodies.${r.planet}`) })}
              <span className="mg-recap-list__when">
                {r.end
                  ? tr('range', { start: formatDayMonth(r.start, locale), end: formatDayMonth(r.end, locale) })
                  : tr('since', { start: formatDayMonth(r.start, locale) })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
