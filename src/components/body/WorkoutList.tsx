'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { reorderWorkouts } from '@/actions/fitness';
import { ReorderButtons } from './ReorderButtons';

interface WorkoutItem {
  id: string;
  name: string;
  notes: string | null;
  items: number;
}

/** Treinos de um programa, com reordenação. */
export function WorkoutList({ programId, workouts }: { programId: string; workouts: WorkoutItem[] }) {
  const t = useTranslations('fitness.workouts');
  if (!workouts.length) return <p className="mg-body-empty">{t('empty')}</p>;
  const ids = workouts.map((w) => w.id);
  return (
    <ul className="mg-workout-list">
      {workouts.map((w, i) => (
        <li key={w.id} className="mg-workout-item__head">
          <WorkoutRow workout={w} label={t('exercisesCount', { n: w.items })} />
          <ReorderButtons ids={ids} index={i} onReorder={(order) => reorderWorkouts(programId, order)} />
        </li>
      ))}
    </ul>
  );
}

export function WorkoutRow({ workout, label }: { workout: WorkoutItem; label: string }) {
  return (
    <Link href={`/body/workouts/${workout.id}`} className="mg-workout-row">
      <span className="mg-workout-row__text">
        <span className="mg-workout-row__name">{workout.name}</span>
        <span className="mg-workout-row__meta">
          {label}
          {workout.notes ? ` · ${workout.notes}` : ''}
        </span>
      </span>
    </Link>
  );
}
