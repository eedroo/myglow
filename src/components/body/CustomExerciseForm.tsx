'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { archiveCustomExercise, createCustomExercise, updateCustomExercise } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

type Measure = 'REPS_WEIGHT' | 'REPS' | 'DURATION';
const MUSCLES = ['chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'lats', 'middle back', 'lower back', 'traps', 'abdominals', 'glutes', 'quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors', 'neck'];
const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'kettlebells', 'bands', 'body only', 'other'];

interface Props {
  exercise?: { id: string; name: string; measure: Measure; primaryMuscles: string[]; equipment: string | null };
}

/** Exercício próprio: nome, como se regista, músculos e equipamento; arquivar. */
export function CustomExerciseForm({ exercise }: Props) {
  const t = useTranslations('fitness');
  const te = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(exercise?.name ?? '');
  const [measure, setMeasure] = useState<Measure>(exercise?.measure ?? 'REPS_WEIGHT');
  const [muscles, setMuscles] = useState<string[]>(exercise?.primaryMuscles ?? []);
  const [equipment, setEquipment] = useState(exercise?.equipment ?? '');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant={exercise ? 'ghost' : 'subtle'} onClick={() => setOpen(true)}>
        {exercise ? t('custom.edit') : t('custom.new')}
      </Button>
    );
  }
  const input = { name, measure, primaryMuscles: muscles, equipment: equipment || null };
  const save = () =>
    start(async () => {
      if (exercise) {
        const res = await updateCustomExercise(exercise.id, input);
        if (!res.ok) return setError(te(res.error));
        setOpen(false);
        return router.refresh();
      }
      const res = await createCustomExercise(input);
      if (!res.ok) return setError(te(res.error));
      router.push(`/body/exercises/${encodeURIComponent(res.data.id)}`);
    });

  return (
    <section className="mg-ex-form" aria-label={exercise ? t('custom.edit') : t('custom.new')}>
      <label>
        {t('custom.name')}
        <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        {t('custom.measure')}
        <select className="mg-input" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
          {(['REPS_WEIGHT', 'REPS', 'DURATION'] as const).map((m) => (
            <option key={m} value={m}>
              {t(`measures.${m}`)}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mg-ex-form__muscles">
        <legend>{t('custom.muscles')}</legend>
        {MUSCLES.map((m) => {
          const on = muscles.includes(m);
          return (
            <button
              key={m}
              type="button"
              className="mg-chip-toggle"
              aria-pressed={on}
              disabled={!on && muscles.length >= 5}
              onClick={() => setMuscles(on ? muscles.filter((x) => x !== m) : [...muscles, m])}
            >
              {t(`muscles.${m}`)}
            </button>
          );
        })}
      </fieldset>
      <label>
        {t('custom.equipment')}
        <select className="mg-input" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="">{t('equipment.none')}</option>
          {EQUIPMENT.map((m) => (
            <option key={m} value={m}>
              {t(`equipment.${m}`)}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <div className="mg-program-form__actions">
        <Button className="mg-btn--body" loading={pending} disabled={!name.trim()} onClick={save}>
          {t('custom.save')}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t('custom.cancel')}
        </Button>
        {exercise && (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!window.confirm(t('custom.archiveConfirm', { name: exercise.name }))) return;
                await archiveCustomExercise(exercise.id);
                router.push('/body/exercises?tab=mine');
              })
            }
          >
            {t('custom.archive')}
          </Button>
        )}
      </div>
    </section>
  );
}
