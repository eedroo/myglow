'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatLongDate } from '@/lib/dates';
import type { RecapSlideProps } from './RecapSlideView';

/** O melhor dia do período e a intenção desse dia. */
export function RecapHighlight({ slide, locale }: RecapSlideProps<'highlight'>) {
  const t = useTranslations('recap.highlight');
  return (
    <div className="mg-recap-highlight">
      <MagicIcon name="star" size="lg" decorative />
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      <p className="mg-recap-slide__text">{formatLongDate(slide.date, locale)}</p>
      {slide.intention && (
        <>
          <p className="mg-recap-slide__text">{t('intentionLabel')}</p>
          <blockquote className="mg-recap-slide__quote">{t('intention', { intention: slide.intention })}</blockquote>
        </>
      )}
    </div>
  );
}
