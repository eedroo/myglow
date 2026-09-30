'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { QuizQuestion } from '@/lib/grimoire/schema';

/** Revisão espaçada: pergunta de uma lição anterior; mostra a explicação depois de responder. */
export function ReviewCard({ question, onAnswer }: { question: QuizQuestion; onAnswer?: (correct: boolean) => void }) {
  const t = useTranslations('grimoire.review');
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;

  return (
    <article className="mg-card-review">
      <p className="mg-card-review__eyebrow">{t('eyebrow')}</p>
      <h2 className="mg-card-review__prompt">{question.prompt}</h2>
      <ul className="mg-card-review__options">
        {question.options.map((o) => {
          const state = answered && o.id === question.correct ? ' mg-card-review__option--correct' : answered && o.id === picked ? ' mg-card-review__option--wrong' : '';
          return (
            <li key={o.id}>
              <button
                type="button"
                className={`mg-card-review__option${state}`}
                disabled={answered}
                aria-pressed={picked === o.id}
                onClick={() => {
                  setPicked(o.id);
                  onAnswer?.(o.id === question.correct);
                }}
              >
                {o.text}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mg-card-review__explain" role="status" aria-live="polite">
        {answered ? `${picked === question.correct ? t('correct') : t('wrong')} ${question.explanation}` : t('answerFirst')}
      </p>
    </article>
  );
}
