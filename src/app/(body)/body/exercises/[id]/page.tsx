import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { getExerciseDetail, getExerciseHistory } from '@/lib/fitness/queries';
import { GlassCard } from '@/components/ui/GlassCard';
import { BodyHeader } from '@/components/body/BodyHeader';
import { AddToWorkout } from '@/components/body/AddToWorkout';
import { CustomExerciseForm } from '@/components/body/CustomExerciseForm';
import { ExerciseDetail, ExerciseHistory, ExerciseHowTo } from '@/components/body/ExerciseDetail';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.exercises');
  return { title: t('title') };
}

/** Um exercício: histórico agrupado por data, como se faz e "Adicionar a um treino". */
export default async function ExerciseRoute({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const id = decodeURIComponent(params.id).slice(0, 191);
  const [t, detail, history, user, workouts] = await Promise.all([
    getTranslations('fitness'),
    getExerciseDetail(userId, id, locale),
    getExerciseHistory(userId, id),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    db.fitnessWorkout.findMany({
      where: { userId, archivedAt: null, program: { archivedAt: null } },
      orderBy: [{ program: { order: 'asc' } }, { order: 'asc' }],
      select: { id: true, name: true, program: { select: { name: true } } },
    }),
  ]);
  if (!detail) notFound();
  const { view } = detail;
  return (
    <>
      <BodyHeader title={view.name} backHref="/body/exercises" backLabel={t('nav.exercises')} />
      <div className="mg-body-shell__main">
        <ExerciseDetail exercise={view} level={detail.level} />
        {view.source === 'CUSTOM' && !detail.archived && (
          <CustomExerciseForm exercise={{ id: view.id, name: view.name, measure: view.measure, primaryMuscles: view.primaryMuscles, equipment: view.equipment }} />
        )}
        {!detail.archived && <AddToWorkout exerciseId={view.id} workouts={workouts.map((w) => ({ id: w.id, label: `${w.program.name} · ${w.name}` }))} />}
        <GlassCard title={t('history.title')}>
          <ExerciseHistory groups={history} timezone={user?.timezone ?? 'UTC'} />
        </GlassCard>
        <ExerciseHowTo images={detail.images} instructions={detail.instructions} name={view.name} />
      </div>
    </>
  );
}
