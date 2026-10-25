'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDateRange } from '@/lib/dates';
import type { RecapSlideProps } from './RecapSlideView';

/** Capa: o período e a intenção da pessoa de volta. */
export function RecapCover({ slide, locale }: RecapSlideProps<'cover'>) {
  const t = useTranslations('recap.cover');
  const isWeek = slide.kind === 'WEEK';
  const month = locale === 'en' ? slide.title : slide.title.toLocaleLowerCase(locale);
  return (
    <div className="mg-recap-cover">
      <MagicIcon name={isWeek ? 'calendar' : 'moon-stars'} size="lg" decorative />
      <p className="mg-recap-slide__eyebrow">{formatDateRange(slide.from, slide.to, locale)}</p>
      <h2 className="mg-recap-slide__title">{isWeek ? t('weekTitle') : t('monthTitle', { month })}</h2>
      <p className="mg-recap-slide__text">{isWeek ? t('weekText', { title: slide.title }) : t('monthText')}</p>
      {slide.intention ? (
        <>
          <p className="mg-recap-slide__text">{t('intentionLabel')}</p>
          <blockquote className="mg-recap-slide__quote">{t('intention', { intention: slide.intention })}</blockquote>
        </>
      ) : (
        <p className="mg-recap-slide__text">{t('noIntention')}</p>
      )}
    </div>
  );
}
