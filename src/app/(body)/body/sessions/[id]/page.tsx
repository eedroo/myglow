import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getSessionSummary } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { SessionSummary } from '@/components/body/SessionSummary';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.summary');
  return { title: t('title') };
}

/** Resumo de uma sessão; `?done=1` ao terminar (entrada animada). */
export default async function SessionSummaryRoute({ params, searchParams }: { params: { id: string }; searchParams: { done?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, summary] = await Promise.all([getTranslations('fitness'), getSessionSummary(userId, params.id, locale)]);
  if (!summary) notFound();
  return (
    <>
      <BodyHeader title={summary.name ?? t('sessions.free')} backHref="/body/sessions" backLabel={t('nav.sessions')} />
      <div className="mg-body-shell__main">
        <SessionSummary summary={summary} fresh={searchParams.done === '1'} />
      </div>
    </>
  );
}
