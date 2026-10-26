import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { countCustomExercises, getFitnessPrefs, listPrograms } from '@/lib/fitness/queries';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ProgramList } from '@/components/body/ProgramList';
import { ProgramForm } from '@/components/body/ProgramForm';
import { StartSessionButton } from '@/components/body/StartSessionButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

/** Treinos: programas, os meus exercícios e um treino livre. Primeira entrada → onboarding. */
export default async function BodyHome() {
  const { userId } = await bodyPage();
  const [t, prefs, programs, custom] = await Promise.all([
    getTranslations('fitness'),
    getFitnessPrefs(userId),
    listPrograms(userId),
    countCustomExercises(userId),
  ]);
  if (!prefs.onboardedAt) redirect('/body/welcome');
  const templates = FITNESS_TEMPLATES.map((tpl) => ({ id: tpl.id, name: t(`templates.${tpl.id}.name`), description: t(`templates.${tpl.id}.description`) }));

  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        <ProgramForm templates={templates} />
        <Link href="/body/exercises?tab=mine" className="mg-program-row">
          <span className="mg-program-row__text">
            <span className="mg-program-row__name">{t('home.myExercises', { n: custom })}</span>
            <span className="mg-program-row__meta">{t('home.myExercisesHint')}</span>
          </span>
        </Link>
        <h2 className="mg-body-section-title">{t('home.programs')}</h2>
        <ProgramList programs={programs} />
        <StartSessionButton workoutId={null} label={t('home.freeWorkout')} variant="subtle" />
      </div>
    </>
  );
}
