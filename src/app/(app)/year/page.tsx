import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shell/PageHeader';
import { ComingSoon } from '@/components/shell/ComingSoon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.year');
  return { title: t('title') };
}

export default async function YearPage() {
  const t = await getTranslations('shell.pages.year');
  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <ComingSoon icon="zodiac-wheel" />
    </>
  );
}
