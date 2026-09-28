import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { MagicIcon } from '@/components/ui/MagicIcon';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('common');
  return (
    <>
      <AmbientBackground />
      <main className="mg-auth">
        <div className="mg-auth__brand">
          <MagicIcon name="moon-crescent" size="lg" decorative />
          <p className="mg-auth__wordmark">{t('appName')}</p>
          <p className="mg-auth__tagline">{t('tagline')}</p>
        </div>
        {children}
      </main>
    </>
  );
}
