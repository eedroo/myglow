'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { recapCompleted, recapSeen } from '@/actions/recap';
import type { AppLocale } from '@/i18n/locales';
import type { RecapSlide } from '@/lib/recap/build';
import type { RecapKindKey } from '@/lib/recap/period';
import { SlidePlayer } from '@/components/slides/SlidePlayer';
import { RecapSlideView } from './RecapSlideView';

interface RecapPlayerProps {
  kind: RecapKindKey;
  periodKey: string;
  slides: RecapSlide[];
  locale: AppLocale;
  timezone: string;
  closeHref: string;
  /** A pessoa já pediu para ser avisada quando o Guia abrir. */
  guideInterested: boolean;
}

/** Retrospectiva em ecrã inteiro: toque, deslizar e teclado; sem avanço automático. Usa o `SlidePlayer` partilhado (F18). */
export function RecapPlayer({ kind, periodKey, slides, locale, timezone, closeHref, guideInterested }: RecapPlayerProps) {
  const t = useTranslations('recap');
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const close = useCallback(() => router.push(closeHref), [router, closeHref]);

  useEffect(() => {
    void recapSeen(kind, periodKey);
  }, [kind, periodKey]);

  const view = (slide: RecapSlide, i: number, preload = false) => (
    <RecapSlideView
      slide={slide}
      kind={kind}
      periodKey={periodKey}
      index={i}
      total={slides.length}
      locale={locale}
      timezone={timezone}
      onClose={close}
      guideInterested={guideInterested}
      {...(preload && { preload: true })}
    />
  );

  return (
    <SlidePlayer
      theme="recap"
      className="mg-recap"
      label={t(kind === 'WEEK' ? 'label.week' : 'label.month')}
      closeLabel={t('close')}
      labels={{ prev: t('prev'), next: t('next'), back: t('prev'), skip: t('next'), continue: t('next') }}
      index={index}
      onIndexChange={setIndex}
      onComplete={() => void recapCompleted(kind, periodKey)}
      onClose={close}
      slides={slides.map((slide, i) => ({
        id: `${slide.type}-${i}`,
        interactive: false,
        content: view(slide, i),
        // Só o seguinte ao actual é pré-carregado (como antes).
        ...(i === index + 1 && { preload: view(slide, i, true) }),
      }))}
    />
  );
}
