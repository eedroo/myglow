import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** Páginas públicas (sem login): documentos legais e despedida. */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  return (
    <>
      <AmbientBackground />
      <main className="mg-public" id="main">
        <header className="mg-public__header">
          <Link href="/" className="mg-public__brand">
            <MagicIcon name="moon-crescent" size="sm" decorative />
            {t('common.appName')}
          </Link>
          <Link href="/" className="mg-btn mg-btn--subtle">
            {t('legal.back')}
          </Link>
        </header>
        {children}
      </main>
    </>
  );
}
