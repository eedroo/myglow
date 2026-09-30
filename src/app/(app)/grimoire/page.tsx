import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/shell/PageHeader';
import { GrimoireMap } from '@/components/grimoire/GrimoireMap';
import { ComingSoonGrimoire } from '@/components/grimoire/ComingSoonGrimoire';
import { contentPrefsFor, getGrimoireState, type GrimoireNotice } from '@/lib/grimoire/queries';

const NOTICES: GrimoireNotice[] = ['locked', 'daily_limit', 'course_locked', 'not_found'];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('grimoire');
  return { title: t('title') };
}

/** /grimoire: mapa da trilha de conhecimento. */
export default async function GrimoirePage({ searchParams }: { searchParams: { notice?: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true, locale: true } });
  if (!user) redirect('/login');

  const [t, state] = await Promise.all([
    getTranslations('grimoire'),
    getGrimoireState(session.user.id, user.timezone, contentPrefsFor(user.locale)),
  ]);
  const notice = NOTICES.find((n) => n === searchParams.notice);

  return (
    <>
      <PageHeader title={t('title')} />
      {state.comingSoon ? <ComingSoonGrimoire /> : <GrimoireMap state={state} notice={notice} />}
    </>
  );
}
