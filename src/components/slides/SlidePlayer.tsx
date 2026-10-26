'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { SlideFooter } from './SlideFooter';

export interface Slide {
  id: string;
  /** Com campos: sem toques nas metades nem deslizar; navega-se pelo rodapé. */
  interactive: boolean;
  content: ReactNode;
  /** Versão escondida do slide seguinte, renderizada antes (imagens e fontes já carregadas). */
  preload?: ReactNode;
  canAdvance?: boolean;
  optional?: boolean;
  /** Texto anunciado ao chegar ao slide (leitores de ecrã). */
  title?: string;
}

export interface SlidePlayerProps {
  slides: Slide[];
  initialIndex?: number;
  /** Controlado (o modo guiado muda de passo a partir dos próprios passos). */
  index?: number;
  onIndexChange?: (i: number) => void;
  onComplete?: () => void;
  onClose: () => void;
  closeLabel: string;
  label: string;
  theme?: 'recap' | 'guided';
  className?: string;
  /** Antes de avançar pelo rodapé (ex.: gravar o texto já, sem esperar pelo debounce). */
  onBeforeAdvance?: () => Promise<void> | void;
  labels: { prev: string; next: string; back: string; skip: string; continue: string };
}

const SWIPE_PX = 50;

/**
 * Leitor de slides em ecrã inteiro partilhado pela retrospectiva (F13) e pelo modo guiado (F18): barras de progresso,
 * setas do teclado, Esc, `aria-live` e `prefers-reduced-motion`. Toques nas metades e deslizar só em slides sem campos.
 */
export function SlidePlayer({
  slides,
  initialIndex = 0,
  index: controlled,
  onIndexChange,
  onComplete,
  onClose,
  closeLabel,
  label,
  theme = 'recap',
  className,
  onBeforeAdvance,
  labels,
}: SlidePlayerProps) {
  const [own, setOwn] = useState(initialIndex);
  const index = controlled ?? own;
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const completed = useRef(false);
  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)]!;

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(last, to));
      if (next === index) return;
      setBack(next < index);
      if (controlled === undefined) setOwn(next);
      onIndexChange?.(next);
    },
    [index, last, controlled, onIndexChange],
  );

  useEffect(() => {
    rootRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (index === last && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
  }, [index, last, onComplete]);

  // Teclado do telemóvel: o rodapé sobe acima dele (visualViewport).
  useEffect(() => {
    const vv = window.visualViewport;
    const root = rootRef.current;
    if (!vv || !root) return;
    const update = () => root.style.setProperty('--slides-keyboard', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') return onClose();
      const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose, index]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    swiped.current = false;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null || slide.interactive) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    swiped.current = true;
    go(dx < 0 ? index + 1 : index - 1);
  };
  // Toque: metade direita avança, esquerda recua (ignora botões, links e campos; nunca em slides com campos).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (slide.interactive || swiped.current) return;
    if ((e.target as HTMLElement).closest('a, button, input, textarea, label, select')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    go(e.clientX - rect.left > rect.width / 2 ? index + 1 : index - 1);
  };

  const advance = async () => {
    setBusy(true);
    try {
      await onBeforeAdvance?.();
    } finally {
      setBusy(false);
    }
    go(index + 1);
  };

  return (
    <div
      ref={rootRef}
      className={['mg-slides', `mg-slides--${theme}`, className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
    >
      <div className="mg-slides__top">
        <div className="mg-slides__bars" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s.id} className={i <= index ? 'mg-slides__bar mg-slides__bar--done' : 'mg-slides__bar'} />
          ))}
        </div>
        <button type="button" className="mg-slides__close" onClick={onClose} aria-label={closeLabel}>
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <p className="mg-visually-hidden" aria-live="polite">
        {slide.title ? `${index + 1}/${slides.length}. ${slide.title}` : `${index + 1}/${slides.length}`}
      </p>

      <div className="mg-slides__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onClick}>
        <div key={slide.id} className={back ? 'mg-slides__slide mg-slides__slide--back' : 'mg-slides__slide'}>
          {slide.content}
        </div>
        {slides[index + 1]?.preload && (
          <div className="mg-slides__preload" aria-hidden="true">
            {slides[index + 1]!.preload}
          </div>
        )}
      </div>

      {slide.interactive ? (
        <SlideFooter
          onBack={() => go(index - 1)}
          onSkip={slide.optional ? () => go(index + 1) : undefined}
          onContinue={() => void advance()}
          canBack={index > 0}
          canContinue={index < last && slide.canAdvance !== false}
          busy={busy}
          labels={labels}
        />
      ) : (
        <div className="mg-slides__nav">
          <button type="button" className="mg-btn mg-btn--subtle" onClick={() => go(index - 1)} disabled={index === 0}>
            {labels.prev}
          </button>
          <button type="button" className="mg-btn mg-btn--subtle" onClick={() => go(index + 1)} disabled={index === last}>
            {labels.next}
          </button>
        </div>
      )}
    </div>
  );
}
