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
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { db } from '@/lib/db';
import { levelFor } from '@/lib/xp/levels';

const ACTIVE_THROTTLE_MS = 60 * 60 * 1000;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.onboarded) redirect('/onboarding');

  const [t, glow] = await Promise.all([
    getTranslations(),
    db.user.findUnique({ where: { id: session.user.id }, select: { xpTotal: true, levelSeen: true, lastActiveAt: true } }),
  ]);
  const xpTotal = glow?.xpTotal ?? 0;

  // Actividade recente (pré-geração IA só para activos nos últimos 7 dias): no máximo 1 escrita por hora.
  const now = new Date();
  if (glow && (!glow.lastActiveAt || now.getTime() - glow.lastActiveAt.getTime() > ACTIVE_THROTTLE_MS)) {
    await db.user.update({ where: { id: session.user.id }, data: { lastActiveAt: now } }).catch(() => undefined);
  }

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
            homeLabel={t('shell.home')}
            badge={<LevelBadge total={xpTotal} name={session.user.name} />}
            bell={<NotificationBell userId={session.user.id} />}
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
              grimoire: t('nav.grimoire'),
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
