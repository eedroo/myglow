import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { JourneyPage } from '@/components/journey/JourneyPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('glow.journey');
  return { title: t('title') };
}

export default function ProfileRoute() {
  return <JourneyPage />;
}
