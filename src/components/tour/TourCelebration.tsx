'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** Fim do guia: brilho dourado, título, texto e "Começar". */
export function TourCelebration({ onFinish }: { onFinish: () => Promise<void> }) {
  const t = useTranslations('tour');
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="mg-tour-done">
      <div ref={ref} className="mg-tour-done__card" role="dialog" aria-modal="true" aria-labelledby="tour-done-title" tabIndex={-1}>
        <span className="mg-tour-done__glow" aria-hidden="true">
          <MagicIcon name="sparkles" size="xl" decorative />
        </span>
        <h2 id="tour-done-title" className="mg-tour-done__title" aria-live="polite">
          {t('steps.done.title')}
        </h2>
        <p className="mg-tour-done__text">{t('steps.done.text')}</p>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onFinish();
          }}
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}
