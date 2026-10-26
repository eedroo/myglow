'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDayMonth } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { MapMuscle, Recovery } from '@/lib/body/muscles';
import { Button } from '@/components/ui/Button';

/** Últimos exercícios que trabalharam o músculo tocado. */
export function MuscleExercisesSheet({
  muscle,
  recovery,
  items,
  onClose,
}: {
  muscle: MapMuscle | null;
  recovery: Recovery;
  items: { id: string; name: string; date: string }[];
  onClose: () => void;
}) {
  const t = useTranslations('body.map');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (muscle && !d.open) d.showModal();
    if (!muscle && d.open) d.close();
  }, [muscle]);
  const state = recovery === 'just-trained' ? 'just' : recovery === 'recovering' ? 'mid' : 'rested';
  return (
    <dialog ref={ref} className="mg-body-sheet mg-muscle-sheet" onClose={onClose} aria-labelledby="muscle-sheet-title">
      {muscle && (
        <>
          <h2 id="muscle-sheet-title" className="mg-body-sheet__title">
            {t(`muscles.${muscle}`)}
          </h2>
          <p className="mg-muscle-map__warn">{t(state)}</p>
          {items.length ? (
            <ul className="mg-muscle-sheet__list">
              {items.map((x) => (
                <li key={x.id}>
                  <Link href={`/body/exercises/${encodeURIComponent(x.id)}`} onClick={onClose}>
                    <span>{x.name}</span>
                    <span className="mg-muscle-sheet__date">{formatDayMonth(x.date, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mg-body-empty">{t('noneRecent')}</p>
          )}
          <div className="mg-body-sheet__actions">
            <Button variant="ghost" onClick={onClose}>
              {t('close')}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
