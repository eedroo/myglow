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
import { WhatsNewDialog } from '@/components/whats-new/WhatsNewDialog';
import { getPendingAnnouncements } from '@/lib/whats-new/queries';
import { VerifyEmailBanner } from '@/components/account/VerifyEmailBanner';
import { PolicyUpdateDialog } from '@/components/account/PolicyUpdateDialog';
import { legalVersions } from '@/lib/env';
import { db } from '@/lib/db';
import { levelFor } from '@/lib/xp/levels';
import { TourProvider } from '@/components/tour/TourProvider';
import { IDLE_TOUR, tourStateFromDb } from '@/lib/tour/machine';
import { getEntitlements } from '@/lib/entitlements/server';
import { EntitlementsProvider } from '@/components/premium/EntitlementsProvider';
import { SentryUser } from '@/components/providers/SentryUser';
import { touchActivity } from '@/lib/activity';
import { todayInTz } from '@/lib/dates';
import { dueRecap, isWorthShowing } from '@/lib/recap/period';
import { recapDaysTouched, recentRecapViews } from '@/lib/recap/server';
import { hasWellbeingConsent } from '@/lib/account/consent';
import { RecapAutoOpen } from '@/components/recap/RecapAutoOpen';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  // Sem sessão aqui = token invalidado (sessionVersion mudou ou conta apagada): o cookie ainda existe e o
  // middleware aceitá-lo-ia; /api/session/end limpa-o e segue para /login.
  if (!session?.user) redirect('/api/session/end');
  if (!session.user.onboarded) redirect('/onboarding');

  const [t, glow, entitlements] = await Promise.all([
    getTranslations(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        xpTotal: true, levelSeen: true, lastActiveAt: true, locale: true, timezone: true, createdAt: true,
        emailVerifiedAt: true, termsVersion: true, privacyVersion: true, wellbeingConsentAt: true,
        tourStep: true, tourPausedAt: true, tourCompletedAt: true,
      },
    }),
    getEntitlements(session.user.id),
  ]);
  // Termos/Política: versão nova (ou nunca aceite) → diálogo bloqueante; as Novidades esperam pela aceitação.
  const legal = legalVersions();
  const policyPending = !!glow && (glow.termsVersion !== legal.terms || glow.privacyVersion !== legal.privacy);
  const announcements = glow && !policyPending
    ? await getPendingAnnouncements({ id: session.user.id, locale: glow.locale, timezone: glow.timezone, createdAt: glow.createdAt }).catch(() => [])
    : [];
  const xpTotal = glow?.xpTotal ?? 0;

  // F13: retrospectiva devida (semana ou mês que acabou) abre sozinha, mas nunca por cima do guia,
  // dos termos, da subida de nível ou das novidades.
  let recapHref: string | null = null;
  if (glow) {
    const tour = tourStateFromDb(glow);
    const blocked = policyPending || tour.status === 'active' || levelFor(xpTotal).level > glow.levelSeen || announcements.length > 0;
    const due = dueRecap({
      today: todayInTz(glow.timezone),
      accountCreatedDay: todayInTz(glow.timezone, glow.createdAt),
      seen: blocked ? [] : await recentRecapViews(session.user.id),
      blocked,
    });
    if (due) {
      const touched = await recapDaysTouched(session.user.id, due, await hasWellbeingConsent(session.user.id));
      if (isWorthShowing(touched)) recapHref = `/recap/${due.kind === 'WEEK' ? 'week' : 'month'}/${due.key}`;
    }
  }

  // F12: um registo por dia em que a pessoa abre a app (+ lastActiveAt, usado na pré-geração IA e nos avisos).
  // Sem esperar: nunca atrasa nem parte a página.
  if (glow) touchActivity(session.user.id, glow.timezone, glow.lastActiveAt);

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
            badge={<LevelBadge total={xpTotal} name={session.user.name} userId={session.user.id} />}
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
          <SentryUser id={session.user.id} />
          <EntitlementsProvider value={entitlements}>
            <TourProvider initial={glow ? tourStateFromDb(glow) : IDLE_TOUR}>
              <VerifyEmailBanner verified={!glow || glow.emailVerifiedAt !== null} />
              {children}
              {policyPending && <PolicyUpdateDialog askWellbeing={!glow?.wellbeingConsentAt} />}
              <WhatsNewDialog items={announcements} />
              {recapHref && <RecapAutoOpen href={recapHref} />}
            </TourProvider>
          </EntitlementsProvider>
        </GlowProvider>
      </AppShell>
    </>
  );
}
