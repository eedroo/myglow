'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { archiveWorkout, createWorkout, updateWorkout } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** Novo treino num programa, ou edição (nome, notas) e arquivo de um treino. */
export function WorkoutForm({ programId, workout }: { programId: string; workout?: { id: string; name: string; notes: string | null } }) {
  const t = useTranslations('fitness.workouts');
  const te = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workout?.name ?? '');
  const [notes, setNotes] = useState(workout?.notes ?? '');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant={workout ? 'ghost' : 'primary'} className={workout ? undefined : 'mg-btn--body'} onClick={() => setOpen(true)}>
        {workout ? t('edit') : t('new')}
      </Button>
    );
  }
  const save = () =>
    start(async () => {
      if (workout) {
        const res = await updateWorkout(workout.id, { name, notes });
        if (!res.ok) return setError(te(res.error));
        setOpen(false);
        return router.refresh();
      }
      const res = await createWorkout(programId, { name, notes });
      if (!res.ok) return setError(te(res.error));
      router.push(`/body/workouts/${res.data.id}`);
    });
  return (
    <section className="mg-workout-form" aria-label={workout ? t('edit') : t('new')}>
      <label>
        {t('name')}
        <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        {t('notes')}
        <TextInput value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <div className="mg-workout-form__actions">
        <Button className="mg-btn--body" loading={pending} disabled={!name.trim()} onClick={save}>
          {t('save')}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
        {workout && (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!window.confirm(t('archiveConfirm', { name: workout.name }))) return;
                await archiveWorkout(workout.id);
                router.push(`/body/programs/${programId}`);
              })
            }
          >
            {t('archive')}
          </Button>
        )}
      </div>
    </section>
  );
}
