import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { listSessions } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { SessionList } from '@/components/body/SessionSummary';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.sessions');
  return { title: t('title') };
}

export default async function SessionsRoute() {
  const { userId } = await bodyPage();
  const [t, sessions] = await Promise.all([getTranslations('fitness.sessions'), listSessions(userId)]);
  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        <SessionList sessions={sessions} />
      </div>
    </>
  );
}
