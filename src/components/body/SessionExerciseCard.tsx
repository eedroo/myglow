'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { prefillSet } from '@/lib/fitness/session';
import type { ActiveSessionView } from '@/lib/fitness/types';
import { SetInputRow, SetRow, useKg, type SetValues } from './SetRow';
import { useTargetText } from './WorkoutItemRow';

type Item = ActiveSessionView['items'][number];
export interface ShownSet extends SetValues {
  id: string;
  pending: boolean;
  prKinds: string[];
  fresh: boolean;
}

/** Um exercício na sessão: alvo, "Última vez", séries feitas e a próxima. */
export function SessionExerciseCard({
  item,
  sets,
  resting,
  onLog,
  onUpdate,
  onDelete,
}: {
  item: Item;
  sets: ShownSet[];
  resting: boolean;
  onLog: (v: SetValues) => string | null;
  onUpdate: (setId: string, v: SetValues) => Promise<string | null>;
  onDelete: (setId: string) => Promise<void>;
}) {
  const t = useTranslations('fitness.session');
  const target = useTargetText();
  const kg = useKg();
  const { exercise } = item;
  const hasTarget = item.target.sets != null || item.target.repsMin != null || item.target.sec != null;
  const last = item.last
    ? item.last.sets
        .map((s) =>
          s.durationSec != null
            ? t('secondsShort', { n: s.durationSec })
            : s.weightGrams != null
              ? `${t('kgShort', { kg: kg(s.weightGrams) })} × ${s.reps ?? 0}`
              : String(s.reps ?? ''),
        )
        .join(', ')
    : null;
  const prefill = prefillSet({ doneInSession: sets.map((s) => ({ exerciseId: exercise.id, ...s })), last: item.last, target: item.target });

  return (
    <article className={`mg-session-ex${resting ? ' mg-session-ex--resting' : ''}`}>
      <h2 className="mg-session-ex__name">
        <Link href={`/body/exercises/${encodeURIComponent(exercise.id)}`}>{exercise.name}</Link>
      </h2>
      {hasTarget && (
        <p className="mg-session-ex__target">
          {target({ targetSets: item.target.sets, targetRepsMin: item.target.repsMin, targetRepsMax: item.target.repsMax, targetSec: item.target.sec }, item.target.restSec)}
        </p>
      )}
      {last && <p className="mg-session-ex__last">{t('lastTime', { sets: last })}</p>}
      {sets.length > 0 && (
        <ol className="mg-session-ex__sets">
          {sets.map((s, i) => (
            <SetRow
              key={s.id}
              n={i + 1}
              measure={exercise.measure}
              values={s}
              pending={s.pending}
              prKinds={s.prKinds}
              fresh={s.fresh}
              onSave={(v) => onUpdate(s.id, v)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </ol>
      )}
      <SetInputRow measure={exercise.measure} prefill={prefill} onDone={onLog} />
    </article>
  );
}
