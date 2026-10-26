import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getWorkout, listExercises } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { WorkoutForm } from '@/components/body/WorkoutForm';
import { WorkoutItems } from '@/components/body/WorkoutItems';
import { StartSessionButton } from '@/components/body/StartSessionButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

/** Exercícios do treino com o alvo; adicionar, reordenar, editar; "Começar treino". */
export default async function WorkoutRoute({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, workout, exercises] = await Promise.all([getTranslations('fitness'), getWorkout(userId, params.id, locale), listExercises(userId, locale)]);
  if (!workout) notFound();
  return (
    <>
      <BodyHeader title={workout.name} backHref={`/body/programs/${workout.programId}`} backLabel={workout.programName} />
      <div className="mg-body-shell__main">
        {workout.notes && <p className="mg-workout-row__meta">{workout.notes}</p>}
        <WorkoutItems workoutId={workout.id} items={workout.items} exercises={exercises} />
        <WorkoutForm programId={workout.programId} workout={{ id: workout.id, name: workout.name, notes: workout.notes }} />
        {workout.items.length > 0 && (
          <div className="mg-body-cta">
            <StartSessionButton workoutId={workout.id} label={t('workouts.start')} />
          </div>
        )}
      </div>
    </>
  );
}
