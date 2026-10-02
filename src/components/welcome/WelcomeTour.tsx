'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { markWelcomeSeen } from '@/actions/welcome';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

/** Ícones de cada ecrã da apresentação (os textos estão em `welcome.slides`). */
const SLIDES: MagicIconName[][] = [['sun', 'moon-crescent'], ['calendar'], ['grimoire'], ['glow-orb']];
const SWIPE_PX = 50;

/** Apresentação de 4 ecrãs depois do nascimento: swipe, setas, teclado, pontos e "Saltar". */
export function WelcomeTour() {
  const t = useTranslations('welcome');
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const startX = useRef<number | null>(null);
  const last = index === SLIDES.length - 1;

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, i))), []);
  const finish = () => startTransition(() => markWelcomeSeen());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  return (
    <section
      className="mg-welcome"
      aria-roledescription={t('roledescription')}
      aria-label={t('label')}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <button type="button" className="mg-welcome__skip" onClick={finish} disabled={pending}>
        {t('skip')}
      </button>

      {SLIDES.map((icons, i) => (
        <div
          key={i}
          className={i === index ? 'mg-welcome__slide mg-welcome__slide--active' : 'mg-welcome__slide'}
          role="group"
          aria-roledescription={t('slide')}
          aria-label={t('position', { n: i + 1, total: SLIDES.length })}
          aria-hidden={i !== index}
        >
          <div className="mg-welcome__art">
            {icons.map((icon) => (
              <MagicIcon key={icon} name={icon} size="xl" decorative />
            ))}
          </div>
          <h1 className="mg-welcome__title">{t(`slides.${i}.title` as 'slides.0.title')}</h1>
          <p className="mg-welcome__text">{t(`slides.${i}.text` as 'slides.0.text')}</p>
        </div>
      ))}

      <div className="mg-welcome__dots" role="tablist" aria-label={t('label')}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={t('position', { n: i + 1, total: SLIDES.length })}
            className={i === index ? 'mg-welcome__dot mg-welcome__dot--current' : 'mg-welcome__dot'}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className="mg-welcome__actions">
        {index > 0 && (
          <Button variant="ghost" onClick={() => go(index - 1)} disabled={pending}>
            {t('back')}
          </Button>
        )}
        {last ? (
          <Button onClick={finish} loading={pending}>
            {t('start')}
          </Button>
        ) : (
          <Button onClick={() => go(index + 1)}>{t('next')}</Button>
        )}
      </div>
    </section>
  );
}
