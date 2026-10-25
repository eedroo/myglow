'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import type { RecapSlideProps } from './RecapSlideView';

const moodIcon = (m: number) => `mood-${Math.min(5, Math.max(1, Math.round(m)))}` as MagicIconName;

/** Como acordou, humor e meta de sono (só com consentimento de bem-estar; o servidor já filtra). */
export function RecapRest({ slide, locale }: RecapSlideProps<'rest'>) {
  const t = useTranslations('recap.rest');
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <div className="mg-recap-rest">
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      <ul className="mg-recap-list">
        {slide.avgWakeMood !== null && (
          <li className="mg-recap-list__item">
            <MagicIcon name={moodIcon(slide.avgWakeMood)} size="md" label={fmt.format(slide.avgWakeMood)} />
            <span className="mg-recap-list__label">{t('wake')}</span>
          </li>
        )}
        {slide.avgMood !== null && (
          <li className="mg-recap-list__item">
            <MagicIcon name={moodIcon(slide.avgMood)} size="md" label={fmt.format(slide.avgMood)} />
            <span className="mg-recap-list__label">{t('mood')}</span>
          </li>
        )}
        {slide.sleepGoal.done > 0 && (
          <li className="mg-recap-list__item">
            <MagicIcon name="bed" size="md" decorative />
            <span className="mg-recap-list__label">{t('sleep')}</span>
            <span className="mg-recap-list__value">{t('count', { done: slide.sleepGoal.done, of: slide.sleepGoal.of })}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
