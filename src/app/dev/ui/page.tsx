import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { UiShowcase } from '@/components/dev/UiShowcase';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { MAGIC_ICONS, MAGIC_ICON_NAMES } from '@/lib/icons';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dev');
  return { title: t('title'), robots: { index: false } };
}

export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const icons = MAGIC_ICON_NAMES.map((name) => ({ name, ready: MAGIC_ICONS[name].ready }));
  return (
    <>
      <AmbientBackground />
      <UiShowcase icons={icons} />
    </>
  );
}
