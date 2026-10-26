'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { remainingRest } from '@/lib/fitness/session';
import { Button } from '@/components/ui/Button';
import { formatClock, useNow } from './useNow';

const R = 36;
const C = 2 * Math.PI * R;

/** Som curto (Web Audio, sem ficheiros) e vibração no fim do descanso. */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => void ctx.close();
    }
  } catch {
    // sem som: fica a vibração e o texto
  }
  navigator.vibrate?.(200);
}

/** Faixa fixa do descanso: contagem, anel, −15 s, +30 s, Saltar; a 0 "Bora!". */
export function RestTimer({
  endsAt,
  totalSec,
  exerciseName,
  onAdd,
  onSkip,
}: {
  endsAt: string;
  totalSec: number;
  exerciseName: string | null;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
}) {
  const t = useTranslations('fitness.rest');
  const now = useNow(250);
  const left = remainingRest(new Date(endsAt), now);
  const done = left === 0;
  const rang = useRef<string | null>(null);

  useEffect(() => {
    // Só toca se o fim foi visto com a app aberta (não ao voltar muito depois).
    if (done && rang.current !== endsAt && now.getTime() - new Date(endsAt).getTime() < 3000) {
      rang.current = endsAt;
      beep();
    }
  }, [done, endsAt, now]);

  const frac = totalSec > 0 ? Math.min(1, left / totalSec) : 0;
  return (
    <section className={`mg-rest${done ? ' mg-rest--done' : ''}`} aria-label={t('label')}>
      <div className="mg-rest__ring">
        <svg viewBox="0 0 84 84" aria-hidden="true">
          <circle className="mg-rest__track" cx="42" cy="42" r={R} />
          <circle className="mg-rest__arc" cx="42" cy="42" r={R} strokeDasharray={`${C * frac} ${C}`} />
        </svg>
        <span className="mg-rest__count" role="timer" aria-live={done ? 'assertive' : 'off'}>
          {done ? t('go') : formatClock(left).replace(/^0(\d):/, '$1:')}
        </span>
      </div>
      <div className="mg-rest__body">
        <span className="mg-rest__label">{exerciseName ? t('after', { name: exerciseName }) : t('label')}</span>
        <div className="mg-rest__actions">
          {!done && (
            <>
              <Button variant="subtle" onClick={() => onAdd(-15)}>
                {t('minus15')}
              </Button>
              <Button variant="subtle" onClick={() => onAdd(30)}>
                {t('plus30')}
              </Button>
            </>
          )}
          <Button variant={done ? 'primary' : 'ghost'} className={done ? 'mg-btn--body' : undefined} onClick={onSkip}>
            {done ? t('close') : t('skip')}
          </Button>
        </div>
      </div>
    </section>
  );
}
