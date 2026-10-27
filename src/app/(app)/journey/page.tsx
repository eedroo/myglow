import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getJourney } from '@/lib/journey/server';
import { PageHeader } from '@/components/shell/PageHeader';
import { JourneyPath } from '@/components/journey-path/JourneyPath';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('journey.path');
  return { title: t('title') };
}

/** F19: a jornada da metodologia em 5 etapas. */
export default async function JourneyRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const [t, journey] = await Promise.all([getTranslations('journey.path'), getJourney(session.user.id)]);
  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <JourneyPath journey={journey} />
    </>
  );
}
