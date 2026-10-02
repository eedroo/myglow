import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { ServiceWorkerRegister } from '@/components/providers/ServiceWorkerRegister';
import { SYSTEM_COLORS, prefToNextTheme } from '@/lib/theme';
import { appUrl } from '@/lib/env';
import '@/styles/index.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  const appName = t('appName');
  return {
    metadataBase: new URL(appUrl()),
    title: { default: appName, template: `%s · ${appName}` },
    description: t('description'),
    applicationName: appName,
    appleWebApp: { capable: true, title: appName, statusBarStyle: 'black-translucent' },
    icons: {
      icon: [
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: SYSTEM_COLORS.lightBackground },
    { media: '(prefers-color-scheme: dark)', color: SYSTEM_COLORS.darkBackground },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages, session] = await Promise.all([getLocale(), getMessages(), auth()]);
  // F10: sem sessão (página pública, login, registo) segue o tema do sistema.
  const defaultTheme = session?.user ? prefToNextTheme(session.user.theme) : 'system';

  return (
    <html lang={locale} className={`${cormorant.variable} ${jost.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme={defaultTheme}>
          <AuthSessionProvider session={session}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              {children}
            </NextIntlClientProvider>
          </AuthSessionProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
