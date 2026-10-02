import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { LandingPage } from '@/components/landing/LandingPage';

const OG_LOCALE: Record<string, string> = { 'pt-PT': 'pt_PT', 'pt-BR': 'pt_BR', en: 'en_GB' };

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations('landing.meta'), getLocale()]);
  const title = t('title');
  const description = t('description');
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', url: '/', siteName: 'MYGLOW', title, description, locale: OG_LOCALE[locale] ?? 'pt_PT' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** `/`: com sessão vai para o dia de hoje; sem sessão mostra a página pública (F10). */
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect('/today');
  return <LandingPage />;
}
