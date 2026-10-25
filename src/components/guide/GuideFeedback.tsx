'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { rateGuide } from '@/actions/guide';

/** "Esta leitura ajudou?" com ícones de linha; a escolha fica marcada. */
export function GuideFeedback({ kind, periodKey, initial }: { kind: 'WEEK' | 'MONTH'; periodKey: string; initial: number | null }) {
  const t = useTranslations('guide.feedback');
  const [rating, setRating] = useState<number | null>(initial);
  const [, start] = useTransition();
  const rate = (r: 1 | -1) => {
    setRating(r);
    start(async () => {
      await rateGuide(kind, periodKey, r);
    });
  };
  return (
    <div className="mg-guide-feedback" role="group" aria-label={t('question')}>
      <span className="mg-guide-feedback__label">{rating === null ? t('question') : t('thanks')}</span>
      <button type="button" className="mg-guide-feedback__btn" aria-pressed={rating === 1} aria-label={t('yes')} onClick={() => rate(1)}>
        <ThumbsUp size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button type="button" className="mg-guide-feedback__btn" aria-pressed={rating === -1} aria-label={t('no')} onClick={() => rate(-1)}>
        <ThumbsDown size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
