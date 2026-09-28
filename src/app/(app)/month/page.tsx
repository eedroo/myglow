import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shell/PageHeader';
import { ComingSoon } from '@/components/shell/ComingSoon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.month');
  return { title: t('title') };
}

export default async function MonthPage() {
  const t = await getTranslations('shell.pages.month');
  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <ComingSoon icon="moon-stars" />
    </>
  );
}
