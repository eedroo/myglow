import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { listExercises } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ExerciseList } from '@/components/body/ExerciseList';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.exercises');
  return { title: t('title') };
}

export default async function ExercisesRoute({ searchParams }: { searchParams: { tab?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, exercises] = await Promise.all([getTranslations('fitness'), listExercises(userId, locale)]);
  return (
    <>
      <BodyHeader title={t('exercises.title')} />
      <div className="mg-body-shell__main">
        <ExerciseList exercises={exercises} initialTab={searchParams.tab === 'mine' ? 'mine' : 'all'} />
      </div>
    </>
  );
}
