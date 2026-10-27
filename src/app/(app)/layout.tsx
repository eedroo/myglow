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
import { getActiveSessionBrief } from '@/lib/fitness/queries';
import { ActiveSessionPill } from '@/components/body/ActiveSessionPill';
import { GuidedAutoOpen } from '@/components/guided/GuidedAutoOpen';
import { dayGuided } from '@/lib/guided/server';
import { routeSegment } from '@/lib/guided/flows';
import { getDailyEntry } from '@/lib/daily/queries';
import { getJourney, tourJourney } from '@/lib/journey/server';
import { getJourneyLessons } from '@/lib/journey/content';
import { shouldShowWhatsNew } from '@/lib/journey/announcements';
import { UnlockCeremonyProvider } from '@/components/journey-path/UnlockCeremony';
import { WhatsNew } from '@/components/journey-path/WhatsNew';
import { dbToAppLocale } from '@/i18n/locales';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  // Sem sessão aqui = token invalidado (sessionVersion mudou ou conta apagada): o cookie ainda existe e o
  // middleware aceitá-lo-ia; /api/session/end limpa-o e segue para /login.
  if (!session?.user) redirect('/api/session/end');
  if (!session.user.onboarded) redirect('/onboarding');

  const [t, glow, entitlements, journey, v2] = await Promise.all([
    getTranslations(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        xpTotal: true, levelSeen: true, lastActiveAt: true, locale: true, timezone: true, createdAt: true,
        emailVerifiedAt: true, termsVersion: true, privacyVersion: true, wellbeingConsentAt: true,
        tourStep: true, tourPausedAt: true, tourCompletedAt: true, guidedAutoOpen: true,
        journeyMappedAt: true, announcementSeen: true,
      },
    }),
    getEntitlements(session.user.id),
    getJourney(session.user.id),
    db.announcement.findUnique({ where: { key: 'v2' }, select: { key: true } }),
  ]);
  // Termos/Política: versão nova (ou nunca aceite) → diálogo bloqueante; as Novidades esperam pela aceitação.
  const legal = legalVersions();
  const policyPending = !!glow && (glow.termsVersion !== legal.terms || glow.privacyVersion !== legal.privacy);
  const announcements = glow && !policyPending
    ? await getPendingAnnouncements({ id: session.user.id, locale: glow.locale, timezone: glow.timezone, createdAt: glow.createdAt }).catch(() => [])
    : [];
  const xpTotal = glow?.xpTotal ?? 0;

  // F19: slides da v2 (a quem já usava a app, depois de publicados) e a mini-lição de um novo passo. Abaixo das
  // políticas, da subida de nível e do onboarding guiado; acima da retrospectiva e do modo guiado automático.
  const aboveJourney = !glow || policyPending || levelFor(xpTotal).level > glow.levelSeen || tourStateFromDb(glow).status === 'active' || announcements.length > 0;
  const showWhatsNew = !aboveJourney && !!glow && shouldShowWhatsNew({ mappedAt: glow.journeyMappedAt, seen: glow.announcementSeen, published: !!v2, key: 'v2' });
  const pendingCeremony = aboveJourney || showWhatsNew ? null : journey.pendingCeremony;
  const journeyBlocks = showWhatsNew || pendingCeremony !== null;

  // F13: retrospectiva devida (semana ou mês que acabou) abre sozinha, mas nunca por cima do guia,
  // dos termos, da subida de nível ou das novidades.
  let recapHref: string | null = null;
  if (glow) {
    const tour = tourStateFromDb(glow);
    const blocked = policyPending || tour.status === 'active' || levelFor(xpTotal).level > glow.levelSeen || announcements.length > 0 || journeyBlocks;
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

  // F18: "Abrir o Hoje no modo guiado": o fluxo sugerido, uma vez por fluxo e dia, abaixo do guia, das políticas, da
  // subida de nível, das novidades e da retrospectiva.
  let guidedHref: string | null = null;
  if (glow?.guidedAutoOpen && !recapHref && !journeyBlocks && !policyPending && announcements.length === 0 && levelFor(xpTotal).level <= glow.levelSeen && tourStateFromDb(glow).status !== 'active') {
    const today = todayInTz(glow.timezone);
    const entry = await getDailyEntry(session.user.id, today);
    const g = await dayGuided(session.user.id, { date: today, today, tz: glow.timezone, entry, wellbeing: !!glow.wellbeingConsentAt });
    if (g.suggested && !(await db.guidedRun.findUnique({ where: { userId_flow_periodKey: { userId: session.user.id, flow: g.suggested, periodKey: today } }, select: { flow: true } }))) {
      guidedHref = `/guided/day/${today}/${routeSegment(g.suggested)}`;
    }
  }

  // F16: sessão de treino em curso → pílula no Hoje para voltar a ela.
  const bodySession = entitlements.features['body-pro'] ? await getActiveSessionBrief(session.user.id).catch(() => null) : null;

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
            locked={journey.planners.has('month') ? [] : ['month', 'year']}
          />
        }
      >
        <GlowProvider level={levelFor(xpTotal).level} levelSeen={glow?.levelSeen ?? 1}>
          <SentryUser id={session.user.id} />
          <EntitlementsProvider value={entitlements}>
            <TourProvider initial={glow ? tourStateFromDb(glow) : IDLE_TOUR} journey={tourJourney(journey)}>
            <UnlockCeremonyProvider
              lessons={getJourneyLessons(dbToAppLocale(glow?.locale ?? session.user.locale))}
              pending={pendingCeremony}
              today={todayInTz(glow?.timezone ?? 'UTC')}
              wellbeing={!!glow?.wellbeingConsentAt}
              bodyPro={!!entitlements.features['body-pro']}
            >
              <VerifyEmailBanner verified={!glow || glow.emailVerifiedAt !== null} />
              {children}
              {policyPending && <PolicyUpdateDialog askWellbeing={!glow?.wellbeingConsentAt} />}
              <WhatsNewDialog items={announcements} />
              {recapHref && <RecapAutoOpen href={recapHref} />}
              {guidedHref && <GuidedAutoOpen href={guidedHref} />}
              {bodySession && <ActiveSessionPill startedAt={bodySession.startedAt} onlyOn="/today" />}
              {showWhatsNew && <WhatsNew stage={journey.state.stage} bodyPro={!!entitlements.features['body-pro']} />}
            </UnlockCeremonyProvider>
            </TourProvider>
          </EntitlementsProvider>
        </GlowProvider>
      </AppShell>
    </>
  );
}
