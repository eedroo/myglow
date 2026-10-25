import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { requireFeature } from '@/lib/entitlements/server';
import { listGuideReports } from '@/lib/guide/queries';
import { PageHeader } from '@/components/shell/PageHeader';
import { GuideHistory } from '@/components/guide/GuideHistory';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('guide');
  return { title: t('history.title', { name: t('name') }) };
}

/** Histórico das leituras do Guia (só com acesso). */
export default async function GuideHistoryRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  await requireFeature(session.user.id, 'guide');
  const [t, items] = await Promise.all([getTranslations('guide'), listGuideReports(session.user.id)]);
  return (
    <>
      <PageHeader title={t('history.title', { name: t('name') })} subtitle={t('history.subtitle', { name: t('name') })} />
      <GuideHistory items={items} />
    </>
  );
}
