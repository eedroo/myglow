'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { addWorkoutItems } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';

/** "Adicionar a um treino": escolhe o treino e acrescenta o exercício no fim. */
export function AddToWorkout({ exerciseId, workouts }: { exerciseId: string; workouts: { id: string; label: string }[] }) {
  const t = useTranslations('fitness.exercises');
  const [workoutId, setWorkoutId] = useState(workouts[0]?.id ?? '');
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (!workouts.length) return null;
  return (
    <div className="mg-add-to-workout">
      <select className="mg-input" aria-label={t('addTo')} value={workoutId} onChange={(e) => { setWorkoutId(e.target.value); setDone(false); }}>
        {workouts.map((w) => (
          <option key={w.id} value={w.id}>
            {w.label}
          </option>
        ))}
      </select>
      <Button
        className="mg-btn--body"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await addWorkoutItems(workoutId, [exerciseId]);
            setDone(res.ok);
          })
        }
      >
        {t('addTo')}
      </Button>
      {done && (
        <p className="mg-workout-item__last" role="status">
          {t('added')}
        </p>
      )}
    </div>
  );
}
