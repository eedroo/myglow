'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { Button } from '@/components/ui/Button';
import { PremiumLock } from '@/components/premium/PremiumLock';
import { RecapReflection } from './RecapReflection';
import type { RecapSlideProps } from './RecapSlideView';

interface RecapClosingProps extends RecapSlideProps<'closing'> {
  onClose: () => void;
  guideInterested: boolean;
  /** F14: leitura do Guia deste período. */
  guideHref: string;
}

/** Último slide: a reflexão (se ainda der Glow), a porta para o Guia e planear (ou abrir) o período novo. */
export function RecapClosing({ slide, onClose, guideInterested, guideHref }: RecapClosingProps) {
  const t = useTranslations('recap.closing');
  const name = useTranslations('guide')('name');
  const isWeek = slide.kind === 'WEEK';
  return (
    <div className="mg-recap-closing">
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      <p className="mg-recap-slide__text">{t(isWeek ? 'weekText' : 'monthText')}</p>
      {/* A reflexão do período que passou fecha aqui mesmo, enquanto der Glow. */}
      {slide.reflectionCta && <RecapReflection kind={slide.kind} periodKey={slide.periodKey} />}
      {slide.guide === 'locked' ? (
        <PremiumLock title={t('guideTitle', { name })} teaser={t(isWeek ? 'guideTeaserWeek' : 'guideTeaserMonth')} interested={guideInterested} />
      ) : (
        <section className="mg-recap-closing__soon" aria-label={t('guideTitle', { name })}>
          <MagicIcon name="crystal-ball" size="lg" decorative />
          <h3 className="mg-recap-slide__eyebrow">{t('guideTitle', { name })}</h3>
          <p className="mg-recap-slide__text">{t(slide.guide === 'consent' ? 'guideConsentText' : isWeek ? 'guideReadyWeek' : 'guideReadyMonth', { name })}</p>
          <Link href={guideHref} className="mg-btn mg-btn--primary">
            {t(slide.guide === 'consent' ? 'guideActivate' : 'guideOpen', { name })}
          </Link>
        </section>
      )}
      <div className="mg-recap-closing__actions">
        {/* Já planeado: reforço para abrir o período; senão, planear no passo a passo. */}
        <Link href={slide.nextPlanned ? slide.nextHref : slide.planHref} className="mg-btn mg-btn--primary mg-btn--block">
          {t(slide.nextPlanned ? (isWeek ? 'openWeek' : 'openMonth') : isWeek ? 'planWeek' : 'planMonth')}
        </Link>
        <Button variant="ghost" block onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </div>
  );
}
