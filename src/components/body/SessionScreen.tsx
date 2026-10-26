'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';
import {
  addRest,
  addSessionExercise,
  deleteSet,
  discardSession,
  endSession,
  logSet,
  setClientHidden,
  setSessionNotes,
  skipRest,
  updateSet,
} from '@/actions/fitness';
import { elapsed, validateSet } from '@/lib/fitness/session';
import type { ActiveSessionView, ExerciseView } from '@/lib/fitness/types';
import { Button } from '@/components/ui/Button';
import { ExercisePicker } from './ExercisePicker';
import { RestTimer } from './RestTimer';
import { SessionExerciseCard, type ShownSet } from './SessionExerciseCard';
import { newSetId, readQueue, writeQueue, type QueuedSet } from './sessionQueue';
import type { SetValues } from './SetRow';
import { formatClock, useNow } from './useNow';

/** Cronómetro total, sempre a partir de `startedAt`. */
export function SessionTimer({ startedAt }: { startedAt: string }) {
  const t = useTranslations('fitness.session');
  const now = useNow();
  const time = formatClock(elapsed(new Date(startedAt), now));
  return (
    <span className="mg-session-timer" role="timer" aria-label={t('elapsed', { time })}>
      {time}
    </span>
  );
}

/** Ecrã mantido aceso durante a sessão (quando o browser deixa). */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const request = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
        if (!alive) void lock?.release();
      } catch {
        // recusado (bateria, permissões): segue sem
      }
    };
    void request();
    const onVisible = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [on]);
}

/** A sessão activa: tudo o que se faz no ginásio, com fila sem rede. */
export function SessionScreen({ session, exercises, keepAwake }: { session: ActiveSessionView; exercises: ExerciseView[]; keepAwake: boolean }) {
  const t = useTranslations('fitness.session');
  const te = useTranslations();
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedSet[]>([]);
  const [rest, setRest] = useState<{ endsAt: string; total: number; exerciseId: string | null } | null>(() => {
    if (!session.restEndsAt) return null;
    const item = session.items.find((i) => i.exercise.id === session.restExerciseId);
    return { endsAt: session.restEndsAt, total: item?.target.restSec ?? 90, exerciseId: session.restExerciseId };
  });
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [notes, setNotes] = useState(session.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flushing = useRef(false);

  useWakeLock(keepAwake);

  // A fila vive numa ref (lida já pelo envio) e é espelhada no dispositivo e no ecrã.
  const queueRef = useRef<QueuedSet[]>([]);
  const saveQueue = useCallback(
    (fn: (q: QueuedSet[]) => QueuedSet[]) => {
      const next = fn(queueRef.current);
      queueRef.current = next;
      writeQueue(session.id, next);
      setQueue(next);
    },
    [session.id],
  );

  const serverIds = useMemo(() => new Set(session.items.flatMap((i) => i.doneSets.map((s) => s.id))), [session]);
  // O que o servidor já tem sai da fila.
  useEffect(() => {
    if (queue.some((q) => serverIds.has(q.id))) saveQueue((q) => q.filter((x) => !serverIds.has(x.id)));
  }, [serverIds, queue, saveQueue]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const q of [...queueRef.current]) {
        let res: Awaited<ReturnType<typeof logSet>>;
        try {
          res = await logSet(session.id, q);
        } catch {
          break; // sem rede: tenta outra vez quando voltar
        }
        if (!res.ok) {
          saveQueue((list) => list.filter((x) => x.id !== q.id));
          setError(te(res.error));
          continue;
        }
        if (res.data.restEndsAt) {
          const item = session.items.find((i) => i.exercise.id === q.exerciseId);
          setRest({ endsAt: res.data.restEndsAt, total: item?.target.restSec ?? 90, exerciseId: q.exerciseId });
        }
      }
      router.refresh();
    } finally {
      flushing.current = false;
    }
  }, [router, saveQueue, session.id, session.items, te]);

  useEffect(() => {
    // Fila guardada no dispositivo (de uma visita anterior sem rede).
    if (!queueRef.current.length) {
      queueRef.current = readQueue(session.id);
      setQueue(queueRef.current);
    }
    void flush();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush, session.id]);

  // Em segundo plano: o fim do descanso vai por push; com a app à vista, só o aviso no ecrã.
  useEffect(() => {
    const onVis = () => void setClientHidden(session.id, document.visibilityState === 'hidden').catch(() => {});
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [session.id]);

  const log = (exerciseId: string, restSec: number, v: SetValues): string | null => {
    const item = session.items.find((i) => i.exercise.id === exerciseId);
    if (!item) return null;
    const check = validateSet(item.exercise.measure, { exerciseId, ...v });
    if (!check.ok) return te(`fitness.errors.${check.reason}`);
    const now = new Date();
    saveQueue((q) => [...q, { id: newSetId(), exerciseId, completedAt: now.toISOString(), ...v }]);
    setRest({ endsAt: new Date(now.getTime() + restSec * 1000).toISOString(), total: restSec, exerciseId });
    setError(null);
    void flush();
    return null;
  };

  const shown = (exerciseId: string): ShownSet[] => {
    const item = session.items.find((i) => i.exercise.id === exerciseId);
    const done = (item?.doneSets ?? []).map((s) => ({
      id: s.id,
      pending: false,
      ...(s.reps != null && { reps: s.reps }),
      ...(s.weightGrams != null && { weightGrams: s.weightGrams }),
      ...(s.durationSec != null && { durationSec: s.durationSec }),
    }));
    const queued = queue
      .filter((q) => q.exerciseId === exerciseId && !serverIds.has(q.id))
      .map(({ id, reps, weightGrams, durationSec }) => ({ id, pending: true, reps, weightGrams, durationSec }));
    return [...done, ...queued];
  };

  const restName = rest?.exerciseId ? (session.items.find((i) => i.exercise.id === rest.exerciseId)?.exercise.name ?? null) : null;
  const totalSets = session.items.reduce((n, i) => n + i.doneSets.length, 0) + queue.filter((q) => !serverIds.has(q.id)).length;

  const finish = async () => {
    if (queue.length) {
      await flush();
      if (queueRef.current.some((q) => !serverIds.has(q.id)) && !navigator.onLine) return setError(t('offlineFinish'));
    }
    if (!window.confirm(t('finishConfirm'))) return;
    setBusy(true);
    try {
      const res = await endSession(session.id);
      if (!res.ok) return setError(te(res.error));
      router.push(`/body/sessions/${res.data.id}?done=1`);
    } catch {
      setError(t('offlineFinish'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mg-session">
      <header className="mg-session__top">
        <h1 className="mg-session__name">{session.workoutName ?? t('free')}</h1>
        <SessionTimer startedAt={session.startedAt} />
        <div className="mg-session__actions">
          <Button className="mg-btn--body" loading={busy} onClick={finish}>
            {t('finish')}
          </Button>
          <Button variant="subtle" aria-label={t('more')} aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <MoreHorizontal size={20} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {menu && (
        <div className="mg-session__menu">
          <label>
            {t('notes')}
            <textarea
              className="mg-input"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => void setSessionNotes(session.id, notes).catch(() => {})}
            />
          </label>
          {totalSets === 0 && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!window.confirm(t('discardConfirm'))) return;
                const res = await discardSession(session.id);
                if (!res.ok) return setError(te(res.error));
                writeQueue(session.id, []);
                router.push('/body');
              }}
            >
              {t('discard')}
            </Button>
          )}
        </div>
      )}

      {queue.length > 0 && (
        <p className="mg-session__queue" role="status">
          {t('queued', { n: queue.length })}
        </p>
      )}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}

      {session.items.map((item) => (
        <SessionExerciseCard
          key={item.exercise.id}
          item={item}
          sets={shown(item.exercise.id)}
          resting={rest?.exerciseId === item.exercise.id}
          onLog={(v) => log(item.exercise.id, item.target.restSec, v)}
          onUpdate={async (setId, v) => {
            const res = await updateSet(setId, { reps: v.reps ?? null, weightGrams: v.weightGrams ?? null, durationSec: v.durationSec ?? null });
            if (!res.ok) return te(res.error);
            router.refresh();
            return null;
          }}
          onDelete={async (setId) => {
            await deleteSet(setId);
            router.refresh();
          }}
        />
      ))}
      {!session.items.length && <p className="mg-body-empty">{t('emptyFree')}</p>}

      <Button variant="subtle" block onClick={() => setPicker(true)}>
        {t('addExercise')}
      </Button>
      <ExercisePicker
        exercises={exercises}
        open={picker}
        multiple={false}
        confirmLabel={t('addExerciseConfirm')}
        onClose={() => setPicker(false)}
        onConfirm={async (ids) => {
          if (ids[0]) await addSessionExercise(session.id, ids[0]);
          setPicker(false);
          router.refresh();
        }}
      />

      {rest && (
        <RestTimer
          endsAt={rest.endsAt}
          totalSec={rest.total}
          exerciseName={restName}
          onAdd={async (sec) => {
            const optimistic = new Date(Math.max(Date.now(), new Date(rest.endsAt).getTime() + sec * 1000)).toISOString();
            setRest({ ...rest, endsAt: optimistic, total: Math.max(rest.total, rest.total + sec) });
            const res = await addRest(session.id, sec).catch(() => null);
            if (res?.ok && res.data.restEndsAt) setRest((r) => (r ? { ...r, endsAt: res.data.restEndsAt as string } : r));
          }}
          onSkip={() => {
            setRest(null);
            void skipRest(session.id).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
