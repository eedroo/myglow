'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { Button } from '@/components/ui/Button';
import type { TourStep } from '@/lib/tour/steps';

interface TourBubbleProps {
  step: TourStep;
  index: number;
  total: number;
  /** Elemento em destaque; sem ele o balão fica ao centro. */
  target: HTMLElement | null;
  variant?: 'anchored' | 'center';
  onNext: () => void;
  onLater: () => void;
  onPause: () => void;
}

/** Balão do guia: "2 de 15", título, texto e as acções do passo. Recebe o foco a cada passo. */
export function TourBubble({ step, index, total, target, variant = 'anchored', onNext, onLater, onPause }: TourBubbleProps) {
  const t = useTranslations('tour');
  const ref = useRef<HTMLDivElement>(null);

  // Posição junto ao alvo: por baixo ou por cima (no telemóvel não há espaço dos lados), sem sair do ecrã.
  useEffect(() => {
    const bubble = ref.current;
    if (!bubble || !target || variant !== 'anchored') return;
    bubble.style.visibility = 'hidden'; // até à primeira posição (senão aparecia um instante no canto)
    return autoUpdate(target, bubble, () => {
      void computePosition(target, bubble, {
        strategy: 'fixed',
        placement: step.placement === 'top' ? 'top' : 'bottom',
        middleware: [offset(14), flip({ fallbackPlacements: ['top', 'bottom'] }), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        bubble.style.visibility = 'visible';
      });
    });
  }, [target, variant, step.placement]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [step.id]);

  const classes = variant === 'center' ? 'mg-tour-bubble mg-tour-bubble--center' : 'mg-tour-bubble';
  const titleId = `tour-${step.id}-title`;
  return (
    <div ref={ref} className={classes} role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1}>
      <p className="mg-tour-bubble__step">{t('counter', { index, total })}</p>
      <div aria-live="polite">
        <h2 id={titleId} className="mg-tour-bubble__title">
          {t(`steps.${step.id}.title`)}
        </h2>
        <p className="mg-tour-bubble__text">{t(`steps.${step.id}.text`)}</p>
      </div>
      <div className="mg-tour-bubble__actions">
        <Button variant="ghost" onClick={onPause}>
          {t('pause')}
        </Button>
        {step.optional && (
          <Button variant="subtle" onClick={onLater}>
            {t('later')}
          </Button>
        )}
        {step.advanceOn === 'next' && <Button onClick={onNext}>{t('continue')}</Button>}
      </div>
    </div>
  );
}
