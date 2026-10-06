'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { completeLesson } from '@/actions/grimoire';
import type { LessonPlayerData } from '@/lib/grimoire/queries';
import { ContentCard } from './ContentCard';
import { LessonComplete } from './LessonComplete';
import { ReviewCard } from './ReviewCard';

const SWIPE_PX = 60;

type Step = { kind: 'review'; itemId: string; index: number } | { kind: 'card'; index: number };

/**
 * Leitor em ecrã inteiro: revisões devidas primeiro, depois os cards da lição e o card final.
 * Swipe (pointer), setas e ← →. `completeLesson` é chamado ao chegar ao fim; a acção da prática só aparece aí.
 */
export function LessonPlayer({ data: initial }: { data: LessonPlayerData }) {
  const t = useTranslations('grimoire');
  // Os dados ficam fixos durante a lição: ao concluir, o servidor re-renderiza a página (revalidatePath)
  // e a mesma lição passaria a "revisão", com outras revisões devidas.
  const [data] = useState(initial);
  const router = useRouter();
  const steps: Step[] = [
    ...data.reviews.map((r, index) => ({ kind: 'review' as const, itemId: r.itemId, index })),
    ...data.lesson.cards.map((_, index) => ({ kind: 'card' as const, index })),
  ];
  const [pos, setPos] = useState(0); // steps.length = card final
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<{ lessonsLeft: number; nextLesson: string | null; quizUnlocked: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completing = useRef<Promise<boolean> | null>(null);
  const startX = useRef<number | null>(null);

  const atEnd = pos === steps.length;
  const saving = atEnd && result === null && error === null;
  const practiceCard = data.lesson.cards.find((c) => c.type === 'practice');
  const practiceAction = practiceCard?.type === 'practice' ? practiceCard.action : undefined;
  const step = steps[pos];
  const blocked = step?.kind === 'review' && answers[step.itemId] === undefined;

  const complete = useCallback((): Promise<boolean> => {
    completing.current ??= completeLesson(
      data.courseSlug,
      data.lesson.slug,
      Object.entries(answers).map(([itemId, correct]) => ({ itemId, correct })),
    ).then((res) => {
      if (!res.ok) {
        setError(res.error);
        completing.current = null;
        return false;
      }
      setResult({ lessonsLeft: res.lessonsLeftToday, nextLesson: res.nextLesson, quizUnlocked: res.quizUnlocked });
      return true;
    });
    return completing.current;
  }, [answers, data.courseSlug, data.lesson.slug]);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (delta === 1 && (atEnd || blocked)) return;
      if (delta === -1 && (pos === 0 || atEnd)) return;
      setDir(delta);
      setPos((p) => p + delta);
    },
    [atEnd, blocked, pos],
  );

  useEffect(() => {
    if (atEnd) void complete();
  }, [atEnd, complete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('textarea, input')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const close = () => {
    if (pos > 0 && !atEnd && !window.confirm(t('player.confirmClose'))) return;
    router.push('/grimoire');
  };

  return (
    <div className="mg-player">
      <div className="mg-player__top">
        <button type="button" className="mg-player__close" onClick={close} disabled={saving} aria-label={t('player.close')}>
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div
          className="mg-player__segments"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={Math.min(pos + 1, steps.length)}
          aria-label={t('player.progress', { n: Math.min(pos + 1, steps.length), total: steps.length })}
        >
          {steps.map((_, i) => (
            <span key={i} className={i <= pos ? 'mg-player__segment mg-player__segment--done' : 'mg-player__segment'} />
          ))}
        </div>
      </div>

      <div
        className="mg-player__stage"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button, textarea, a')) return;
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx <= -SWIPE_PX) go(1);
          if (dx >= SWIPE_PX) go(-1);
        }}
      >
        <div key={pos} className={dir === 1 ? 'mg-player__card' : 'mg-player__card mg-player__card--back'} aria-live="polite">
          {atEnd ? (
            <LessonComplete
              replay={data.mode === 'replay'}
              lessonsLeft={result?.lessonsLeft ?? null}
              nextHref={result?.nextLesson ? `/grimoire/${data.courseSlug}/${result.nextLesson}` : null}
              quizUnlocked={result?.quizUnlocked ?? false}
              courseSlug={data.courseSlug}
              practice={practiceAction}
              onRetry={
                error
                  ? () => {
                      setError(null);
                      void complete();
                    }
                  : undefined
              }
            />
          ) : step!.kind === 'review' ? (
            <ReviewCard
              question={data.reviews[step!.index]!.question}
              onAnswer={(correct) => setAnswers((a) => ({ ...a, [(step as { itemId: string }).itemId]: correct }))}
            />
          ) : (
            <ContentCard card={data.lesson.cards[step!.index]!} />
          )}
        </div>
      </div>

      {error && (
        <p className="mg-player__hint" role="alert">
          {t(error)}
        </p>
      )}
      {!atEnd && (
        <div className="mg-player__nav">
          <Button variant="ghost" onClick={() => go(-1)} disabled={pos === 0} aria-label={t('player.prev')}>
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          {blocked && <span className="mg-player__hint">{t('review.answerFirst')}</span>}
          <Button onClick={() => go(1)} disabled={blocked}>
            {t('player.next')}
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
