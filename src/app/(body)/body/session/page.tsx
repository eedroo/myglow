import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getActiveSession, getFitnessPrefs, listExercises } from '@/lib/fitness/queries';
import { SessionScreen } from '@/components/body/SessionScreen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.session');
  return { title: t('title') };
}

/** Sessão activa. Sem sessão, volta ao início do corpo. */
export default async function SessionRoute() {
  const { userId, locale } = await bodyPage();
  const [session, exercises, prefs] = await Promise.all([getActiveSession(userId, locale), listExercises(userId, locale), getFitnessPrefs(userId)]);
  if (!session) redirect('/body');
  return (
    <div className="mg-body-shell__main">
      <SessionScreen session={session} exercises={exercises} keepAwake={prefs.keepAwake} />
    </div>
  );
}
