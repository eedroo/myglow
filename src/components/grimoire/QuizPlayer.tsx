'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useGlow } from '@/components/glow/GlowProvider';
import { submitQuiz, type SubmitQuizResult } from '@/actions/grimoire';
import type { QuizData } from '@/lib/grimoire/queries';
import { QuizResult } from './QuizResult';

/** Quiz final: 5 perguntas, uma de cada vez, com certo/errado e explicação; corrigido no servidor no fim. */
export function QuizPlayer({ data }: { data: QuizData }) {
  const t = useTranslations('grimoire');
  const router = useRouter();
  const { push } = useGlow();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Extract<SubmitQuizResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = data.questions[index]!;
  const picked = answers[q.id];
  const last = index === data.questions.length - 1;

  const finish = async () => {
    setSending(true);
    const res = await submitQuiz(data.courseSlug, answers);
    setSending(false);
    if (!res.ok) return setError(res.error);
    if (res.xp) push(res.xp);
    setResult(res);
  };

  const retry = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
  };

  if (result) {
    const points = result.xp?.awards.reduce((s, a) => s + a.points, 0) ?? 0;
    return (
      <div className="mg-quiz">
        <QuizResult score={result.score} total={data.questions.length} passed={result.passed} badge={result.badge} points={points} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="mg-quiz">
      <div className="mg-quiz__progress">
        <button type="button" className="mg-player__close" onClick={() => router.push('/grimoire')} aria-label={t('player.close')}>
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <span className="mg-quiz__bar">
          <ProgressBar value={index + 1} max={data.questions.length} label={t('quiz.progress', { n: index + 1, total: data.questions.length })} />
        </span>
        <span>{t('quiz.progress', { n: index + 1, total: data.questions.length })}</span>
      </div>

      <section key={q.id} className="mg-quiz__question mg-player__card" aria-labelledby={`q-${q.id}`}>
        <p className="mg-card-review__eyebrow">{t('quiz.title')}</p>
        <h2 id={`q-${q.id}`} className="mg-quiz__prompt">
          {q.prompt}
        </h2>
        <ul className="mg-quiz__options">
          {q.options.map((o) => {
            const state = picked && o.id === q.correct ? ' mg-quiz__option--correct' : picked && o.id === picked ? ' mg-quiz__option--wrong' : '';
            return (
              <li key={o.id}>
                <button
                  type="button"
                  className={`mg-quiz__option${state}`}
                  disabled={!!picked}
                  aria-pressed={picked === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                >
                  {o.text}
                </button>
              </li>
            );
          })}
        </ul>
        {picked && (
          <p className="mg-quiz__explain" role="status">
            {picked === q.correct ? t('quiz.correct') : t('quiz.wrong')} {q.explanation}
          </p>
        )}
      </section>

      {error && <p role="alert">{t(error)}</p>}
      <div className="mg-quiz__actions">
        {last ? (
          <Button onClick={finish} disabled={!picked} loading={sending} loadingLabel={t('quiz.sending')}>
            {t('quiz.finish')}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={!picked}>
            {t('quiz.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
