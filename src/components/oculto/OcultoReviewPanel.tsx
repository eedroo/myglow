'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { reviewOcultoWeek } from '@/actions/oculto';
import { Button } from '@/components/ui/Button';
import type { WeekReview } from '@/lib/oculto/rules';

/** Avaliação automática da semana: o programa lê o diário do treino e decide se avança ou repete. */
export function OcultoReviewPanel({ week }: { week: number }) {
  const t = useTranslations('oculto.review');
  const te = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<(WeekReview & { nextWeek: number | null }) | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    const res = await reviewOcultoWeek().catch(() => ({ ok: false as const, error: 'oculto.errors.offline' }));
    setBusy(false);
    if (!res.ok) return setError(te(res.error));
    setReview(res.data);
  };

  if (!review) {
    return (
      <section className="mg-oculto-review">
        <h2 className="mg-oculto__title">{t('title', { week })}</h2>
        <p className="mg-oculto__text">{t('intro')}</p>
        <Button onClick={() => void run()} loading={busy}>
          {t('run')}
        </Button>
        {error && <p role="alert" className="mg-oculto__error">{error}</p>}
      </section>
    );
  }

  const m = review.metrics;
  return (
    <section className="mg-oculto-review" aria-live="polite">
      <p className="mg-oculto-review__level">{t(`levels.${review.level}`)}</p>
      <h2 className="mg-oculto__title">{review.result === 'ADVANCE' ? t('advanceTitle') : t('repeatTitle')}</h2>
      <ul className="mg-oculto-review__metrics">
        <li>{t('metrics.sessions', { n: m.sessions })}</li>
        <li>{t('metrics.best', { best: Math.round(m.bestSec / 60), goal: Math.round(m.goalSec / 60) })}</li>
        {m.avgConcentration !== null && <li>{t('metrics.focus', { avg: m.avgConcentration })}</li>}
        <li>{t('metrics.diary', { n: m.diaryCount })}</li>
      </ul>
      {review.reasons.length > 0 && (
        <ul className="mg-oculto-review__reasons">
          {review.reasons.map((r) => (
            <li key={r}>{t(`reasons.${r}`)}</li>
          ))}
        </ul>
      )}
      <p className="mg-oculto__text">
        {review.result === 'REPEAT' ? t('repeatText') : review.nextWeek ? t('advanceText', { week: review.nextWeek }) : t('waitingText')}
      </p>
      <Button onClick={() => router.refresh()}>{review.result === 'REPEAT' ? t('repeatCta') : review.nextWeek ? t('advanceCta', { week: review.nextWeek }) : t('ok')}</Button>
    </section>
  );
}
