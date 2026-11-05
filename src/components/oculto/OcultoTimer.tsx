'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LightOrb } from '@/components/friends/LightOrb';
import { Button } from '@/components/ui/Button';
import type { OrbSigns } from '@/lib/friends/orb';

type Phase = 'idle' | 'running' | 'paused' | 'done';
interface Saved {
  phase: Phase;
  /** Instante do fim (a correr) ou segundos que faltam (em pausa). */
  endAt?: number;
  left?: number;
}

interface OcultoTimerProps {
  /** Chave única da sessão e do bloco (o estado sobrevive a sair e voltar à app). */
  storageKey: string;
  minutes: number;
  orb: OrbSigns | null;
  cues: { at: number; text: string }[];
  labels: { start: string; pause: string; resume: string; finish: string; done: string; remaining: string };
  /** Fim (natural ou "Terminar") com os segundos feitos. */
  onDone: (elapsedSec: number) => void;
}

const read = (key: string): Saved | null => {
  try {
    const v = window.sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as Saved) : null;
  } catch {
    return null;
  }
};
const write = (key: string, v: Saved | null) => {
  try {
    if (v) window.sessionStorage.setItem(key, JSON.stringify(v));
    else window.sessionStorage.removeItem(key);
  } catch {
    // sem armazenamento: o timer só não sobrevive a recarregar a página
  }
};

/** Sino suave (Web Audio, sem ficheiros) e vibração curta. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      for (const [freq, delay] of [[528, 0], [792, 0.18]] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 2.4);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 2.5);
      }
    }
  } catch {
    // sem som: fica a vibração
  }
  navigator.vibrate?.([120, 80, 120]);
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Timer do treino com a esfera de luz da pessoa: pulsa devagar e ganha brilho com o tempo; uma faísca acende por minuto.
 * Conta pelo relógio (instante do fim), por isso continua certo se a pessoa sair da app; o ecrã fica aceso a correr.
 */
export function OcultoTimer({ storageKey, minutes, orb, cues, labels, onDone }: OcultoTimerProps) {
  const total = minutes * 60;
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(total);
  const endAt = useRef<number | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const finished = useRef(false);

  const lockScreen = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
      wake.current = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      wake.current = null;
    }
  }, []);
  const unlockScreen = useCallback(() => {
    void wake.current?.release().catch(() => undefined);
    wake.current = null;
  }, []);

  const finish = useCallback(
    (elapsed: number, natural: boolean) => {
      if (finished.current) return;
      finished.current = true;
      setPhase('done');
      setLeft(Math.max(0, total - elapsed));
      write(storageKey, { phase: 'done', left: Math.max(0, total - elapsed) });
      unlockScreen();
      if (natural) chime();
      onDone(elapsed);
    },
    [onDone, storageKey, total, unlockScreen],
  );

  // Retoma o estado guardado (saiu da app, ecrã apagou).
  useEffect(() => {
    const s = read(storageKey);
    if (!s) return;
    if (s.phase === 'running' && s.endAt) {
      endAt.current = s.endAt;
      setPhase('running');
      void lockScreen();
    } else if (s.phase === 'paused' && typeof s.left === 'number') {
      setLeft(s.left);
      setPhase('paused');
    } else if (s.phase === 'done') {
      finished.current = true;
      setLeft(s.left ?? 0);
      setPhase('done');
      onDone(total - (s.left ?? 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => {
      const remaining = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) finish(total, true);
    };
    tick();
    const id = window.setInterval(tick, 250);
    // O Wake Lock cai quando a página fica escondida: volta a pedir ao regressar.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        tick();
        void lockScreen();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [phase, finish, total, lockScreen]);

  useEffect(() => () => unlockScreen(), [unlockScreen]);

  const start = () => {
    endAt.current = Date.now() + left * 1000;
    write(storageKey, { phase: 'running', endAt: endAt.current });
    setPhase('running');
    void lockScreen();
  };
  const pause = () => {
    const remaining = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
    setLeft(remaining);
    write(storageKey, { phase: 'paused', left: remaining });
    setPhase('paused');
    unlockScreen();
  };

  const progress = total ? 1 - left / total : 1;
  const sparks = Math.min(minutes, 30);
  const lit = Math.floor(progress * sparks + 1e-6);
  const cue = phase === 'running' || phase === 'paused' ? [...cues].reverse().find((c) => progress >= c.at) : undefined;

  return (
    <div className={`mg-oculto-timer mg-oculto-timer--${phase}`} style={{ ['--oculto-progress' as string]: progress.toFixed(3) }}>
      <div className="mg-oculto-timer__stage">
        <ul className="mg-oculto-timer__sparks" aria-hidden="true">
          {Array.from({ length: sparks }, (_, i) => (
            <li
              key={i}
              className={i < lit ? 'mg-oculto-timer__spark mg-oculto-timer__spark--on' : 'mg-oculto-timer__spark'}
              style={{ ['--i' as string]: i, ['--n' as string]: sparks }}
            />
          ))}
        </ul>
        <div className="mg-oculto-timer__orb">
          <LightOrb signs={orb} idKey={`oculto-${storageKey}`} />
        </div>
      </div>
      <p className="mg-oculto-timer__time" aria-live="off">
        <span className="mg-visually-hidden">{labels.remaining}: </span>
        {phase === 'done' ? labels.done : mmss(left)}
      </p>
      <p className="mg-oculto-timer__cue" aria-live="polite">
        {cue?.text ?? ' '}
      </p>
      {phase !== 'done' && (
        <div className="mg-oculto-timer__actions">
          {phase === 'running' ? (
            <Button variant="ghost" onClick={pause}>
              {labels.pause}
            </Button>
          ) : (
            <Button onClick={start}>{phase === 'paused' ? labels.resume : labels.start}</Button>
          )}
          {phase !== 'idle' && (
            <Button variant="subtle" onClick={() => finish(total - left, false)}>
              {labels.finish}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
