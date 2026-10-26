import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getProgram } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ProgramForm } from '@/components/body/ProgramForm';
import { WorkoutForm } from '@/components/body/WorkoutForm';
import { WorkoutList } from '@/components/body/WorkoutList';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

/** Treinos de um programa: editar, reordenar, arquivar. */
export default async function ProgramRoute({ params }: { params: { id: string } }) {
  const { userId } = await bodyPage();
  const [t, program] = await Promise.all([getTranslations('fitness'), getProgram(userId, params.id)]);
  if (!program) notFound();
  return (
    <>
      <BodyHeader title={program.name} backHref="/body" backLabel={t('nav.workouts')} />
      <div className="mg-body-shell__main">
        {program.description && <p className="mg-workout-row__meta">{program.description}</p>}
        <WorkoutList programId={program.id} workouts={program.workouts} />
        <WorkoutForm programId={program.id} />
        <ProgramForm program={{ id: program.id, name: program.name, description: program.description, kind: program.kind }} />
      </div>
    </>
  );
}
