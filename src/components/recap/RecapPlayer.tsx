'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { recapCompleted, recapSeen } from '@/actions/recap';
import type { AppLocale } from '@/i18n/locales';
import type { RecapSlide } from '@/lib/recap/build';
import type { RecapKindKey } from '@/lib/recap/period';
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

const SWIPE_PX = 50;

/** Retrospectiva em ecrã inteiro: toque, deslizar e teclado; sem avanço automático. */
export function RecapPlayer({ kind, periodKey, slides, locale, timezone, closeHref, guideInterested }: RecapPlayerProps) {
  const t = useTranslations('recap');
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const completed = useRef(false);
  const last = slides.length - 1;

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(last, to));
      if (next === index) return;
      setBack(next < index);
      setIndex(next);
    },
    [index, last],
  );
  const close = useCallback(() => router.push(closeHref), [router, closeHref]);

  useEffect(() => {
    void recapSeen(kind, periodKey);
    rootRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [kind, periodKey]);

  useEffect(() => {
    if (index === last && !completed.current) {
      completed.current = true;
      void recapCompleted(kind, periodKey);
    }
  }, [index, last, kind, periodKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, close, index]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    swiped.current = false;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    swiped.current = true;
    go(dx < 0 ? index + 1 : index - 1);
  };
  // Toque: metade direita avança, esquerda recua (ignora botões e links do slide).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (swiped.current) return;
    if ((e.target as HTMLElement).closest('a, button, input, textarea, label')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    go(e.clientX - rect.left > rect.width / 2 ? index + 1 : index - 1);
  };

  const slide = slides[index]!;
  const upcoming = slides[index + 1];

  return (
    <div ref={rootRef} className="mg-recap" role="dialog" aria-modal="true" aria-label={t(kind === 'WEEK' ? 'label.week' : 'label.month')} tabIndex={-1}>
      <div className="mg-recap__top">
        <div className="mg-recap__bars" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s.type} className={i <= index ? 'mg-recap__bar mg-recap__bar--done' : 'mg-recap__bar'} />
          ))}
        </div>
        <button type="button" className="mg-recap__close" onClick={close} aria-label={t('close')}>
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="mg-recap__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onClick}>
        <div key={index} className={back ? 'mg-recap__slide mg-recap__slide--back' : 'mg-recap__slide'}>
          <RecapSlideView
            slide={slide}
            kind={kind}
            periodKey={periodKey}
            index={index}
            total={slides.length}
            locale={locale}
            timezone={timezone}
            onClose={close}
            guideInterested={guideInterested}
          />
        </div>
        {upcoming && (
          <div className="mg-recap__preload" aria-hidden="true">
            <RecapSlideView
              slide={upcoming}
              kind={kind}
              periodKey={periodKey}
              index={index + 1}
              total={slides.length}
              locale={locale}
              timezone={timezone}
              onClose={close}
              guideInterested={guideInterested}
              preload
            />
          </div>
        )}
      </div>

      <div className="mg-recap__nav">
        <button type="button" className="mg-btn mg-btn--subtle" onClick={() => go(index - 1)} disabled={index === 0}>
          {t('prev')}
        </button>
        <button type="button" className="mg-btn mg-btn--subtle" onClick={() => go(index + 1)} disabled={index === last}>
          {t('next')}
        </button>
      </div>
    </div>
  );
}
