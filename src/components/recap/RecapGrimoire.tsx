'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { RecapCountUp } from './RecapCountUp';
import type { RecapSlideProps } from './RecapSlideView';

/** Lições do Grimório e emblemas novos. */
export function RecapGrimoire({ slide, locale, preload }: RecapSlideProps<'grimoire'>) {
  const t = useTranslations('recap.grimoire');
  return (
    <div className="mg-recap-grimoire">
      <MagicIcon name="grimoire" size="lg" decorative />
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      {slide.lessons > 0 && (
        <>
          <RecapCountUp value={slide.lessons} locale={locale} still={preload} />
          <p className="mg-recap-slide__text">{t('lessons', { n: slide.lessons })}</p>
        </>
      )}
      {slide.coursesCompleted.length > 0 && (
        <ul className="mg-recap-list">
          {slide.coursesCompleted.map((c) => (
            <li key={c.slug} className="mg-recap-list__item">
              <MagicIcon name={c.icon} size="md" decorative />
              <span className="mg-recap-list__label">{t('badge', { course: c.title })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
