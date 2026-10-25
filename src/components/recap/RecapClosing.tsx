'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { Button } from '@/components/ui/Button';
import { PremiumLock } from '@/components/premium/PremiumLock';
import { XP_POINTS } from '@/lib/xp/rules';
import type { RecapSlideProps } from './RecapSlideView';

interface RecapClosingProps extends RecapSlideProps<'closing'> {
  onClose: () => void;
  guideInterested: boolean;
  /** Página do período, onde fica a reflexão. */
  periodHref: string;
}

/** Último slide: a porta para o Guia, planear o período novo e a reflexão (se ainda der Glow). */
export function RecapClosing({ slide, onClose, guideInterested, periodHref }: RecapClosingProps) {
  const t = useTranslations('recap.closing');
  const isWeek = slide.kind === 'WEEK';
  const reflectionHref = `${periodHref}#${isWeek ? 'week-reflection' : 'month-reflection'}`;
  const points = XP_POINTS[isWeek ? 'WEEK_REFLECTION' : 'MONTH_REFLECTION'];
  return (
    <div className="mg-recap-closing">
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      <p className="mg-recap-slide__text">{t(isWeek ? 'weekText' : 'monthText')}</p>
      {slide.guide === 'locked' ? (
        <PremiumLock title={t('guideTitle')} teaser={t(isWeek ? 'guideTeaserWeek' : 'guideTeaserMonth')} interested={guideInterested} />
      ) : (
        <section className="mg-recap-closing__soon" aria-label={t('guideTitle')}>
          <MagicIcon name="crystal-ball" size="lg" decorative />
          <h3 className="mg-recap-slide__eyebrow">{t('guideTitle')}</h3>
          <p className="mg-recap-slide__text">{t('guideSoon')}</p>
        </section>
      )}
      <div className="mg-recap-closing__actions">
        <Link href={slide.nextHref} className="mg-btn mg-btn--primary mg-btn--block">
          {t(isWeek ? 'planWeek' : 'planMonth')}
        </Link>
        {slide.reflectionCta && (
          <Link href={reflectionHref} className="mg-btn mg-btn--subtle mg-btn--block">
            {t('reflection', { points })}
          </Link>
        )}
        <Button variant="ghost" block onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </div>
  );
}
