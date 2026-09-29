import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { AppShell } from '@/components/shell/AppShell';
import { TopBar } from '@/components/shell/TopBar';
import { BottomNav } from '@/components/shell/BottomNav';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { GlowProvider } from '@/components/glow/GlowProvider';
import { LevelBadge } from '@/components/glow/LevelBadge';
import { db } from '@/lib/db';
import { levelFor } from '@/lib/xp/levels';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.onboarded) redirect('/onboarding');

  const [t, glow] = await Promise.all([
    getTranslations(),
    db.user.findUnique({ where: { id: session.user.id }, select: { xpTotal: true, levelSeen: true } }),
  ]);
  const xpTotal = glow?.xpTotal ?? 0;

  return (
    <>
      <a href="#main" className="mg-visually-hidden">
        {t('common.skipToContent')}
      </a>
      <AmbientBackground />
      <ThemeSync theme={session.user.theme} />
      <AppShell
        topBar={
          <TopBar
            appName={t('common.appName')}
            userName={session.user.name}
            settingsLabel={t('shell.settings')}
            homeLabel={t('shell.home')}
            badge={<LevelBadge total={xpTotal} />}
          />
        }
        nav={
          <BottomNav
            ariaLabel={t('nav.label')}
            labels={{
              today: t('nav.today'),
              week: t('nav.week'),
              month: t('nav.month'),
              year: t('nav.year'),
              profile: t('nav.profile'),
            }}
          />
        }
      >
        <GlowProvider level={levelFor(xpTotal).level} levelSeen={glow?.levelSeen ?? 1}>
          {children}
        </GlowProvider>
      </AppShell>
    </>
  );
}
