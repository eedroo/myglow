'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { removeWorkoutItem, reorderWorkoutItems, updateWorkoutItem } from '@/actions/fitness';
import type { ExerciseView } from '@/lib/fitness/types';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { ExerciseThumb } from './ExerciseThumb';
import { ReorderButtons } from './ReorderButtons';

export interface WorkoutItemView {
  id: string;
  exercise: ExerciseView;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSec: number | null;
  restSec: number;
  customRest: number | null;
  lastDoneAt: string | null;
}

const WEEK_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;

/** "3 × 8–12 · descanso 90 s" (ou "1 × 30 s"). */
export function useTargetText() {
  const t = useTranslations('fitness.target');
  return (i: { targetSets: number | null; targetRepsMin: number | null; targetRepsMax: number | null; targetSec: number | null }, rest?: number) => {
    const sets = i.targetSets ?? 1;
    const what = i.targetSec
      ? t('seconds', { n: i.targetSec })
      : i.targetRepsMin && i.targetRepsMax && i.targetRepsMax !== i.targetRepsMin
        ? `${i.targetRepsMin}–${i.targetRepsMax}`
        : String(i.targetRepsMin ?? i.targetRepsMax ?? '');
    const base = what ? t('sets', { sets, what }) : t('setsOnly', { sets });
    return rest != null ? `${base} · ${t('rest', { n: rest })}` : base;
  };
}

/** Um exercício do treino: alvo, última vez, editar alvo, remover e reordenar. */
export function WorkoutItemRow({ workoutId, item, ids, index }: { workoutId: string; item: WorkoutItemView; ids: string[]; index: number }) {
  const t = useTranslations('fitness.workouts');
  const target = useTargetText();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    sets: String(item.targetSets ?? ''),
    min: String(item.targetRepsMin ?? ''),
    max: String(item.targetRepsMax ?? ''),
    sec: String(item.targetSec ?? ''),
    rest: item.customRest === null ? '' : String(item.customRest),
  });
  const isTime = item.exercise.measure === 'DURATION';
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(',', '.')))) || null);
  const ago = (() => {
    if (!item.lastDoneAt) return null;
    const ms = Date.now() - new Date(item.lastDoneAt).getTime();
    return ms >= WEEK_MS ? t('lastWeeks', { n: Math.floor(ms / WEEK_MS) }) : t('lastDays', { n: Math.max(0, Math.floor(ms / DAY_MS)) });
  })();

  const save = () =>
    start(async () => {
      await updateWorkoutItem(item.id, {
        targetSets: num(form.sets),
        ...(isTime ? { targetSec: num(form.sec) } : { targetRepsMin: num(form.min), targetRepsMax: num(form.max) }),
        restSec: form.rest.trim() === '' ? null : Math.round(Number(form.rest)),
      });
      setEditing(false);
      router.refresh();
    });

  const field = (key: keyof typeof form, label: string) => (
    <label>
      {label}
      <TextInput inputMode="numeric" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} />
    </label>
  );

  return (
    <li className="mg-workout-item">
      <div className="mg-workout-item__head">
        <ExerciseThumb src={item.exercise.thumb} className="mg-workout-item__thumb" />
        <span className="mg-workout-item__text">
          <Link href={`/body/exercises/${encodeURIComponent(item.exercise.id)}`} className="mg-workout-item__name">
            {item.exercise.name}
          </Link>
          <span className="mg-workout-item__target">{target(item, item.restSec)}</span>
          {ago && <span className="mg-workout-item__last">{ago}</span>}
        </span>
        <ReorderButtons ids={ids} index={index} onReorder={(order) => reorderWorkoutItems(workoutId, order)} />
      </div>
      {editing ? (
        <div className="mg-workout-item-form">
          {field('sets', t('targetSets'))}
          {isTime ? field('sec', t('targetSec')) : (
            <>
              {field('min', t('repsMin'))}
              {field('max', t('repsMax'))}
            </>
          )}
          {field('rest', t('restOwn'))}
          <div className="mg-workout-item__actions">
            <Button className="mg-btn--body" loading={pending} onClick={save}>
              {t('save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mg-workout-item__actions">
          <Button variant="ghost" onClick={() => setEditing(true)}>
            {t('editTarget')}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await removeWorkoutItem(item.id);
                router.refresh();
              })
            }
          >
            {t('remove')}
          </Button>
        </div>
      )}
    </li>
  );
}
