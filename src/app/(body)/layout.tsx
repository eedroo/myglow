import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getEntitlements } from '@/lib/entitlements/server';
import { getActiveSessionBrief } from '@/lib/fitness/queries';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { EntitlementsProvider } from '@/components/premium/EntitlementsProvider';
import { BodyShell } from '@/components/body/BodyShell';

/** F16: o "mundo" do Foco no corpo (premium), com navegação própria; sem TopBar nem BottomNav da app. */
export default async function BodyLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.onboarded) redirect('/onboarding');
  const entitlements = await getEntitlements(session.user.id);
  if (!entitlements.features['body-pro']) notFound();
  const active = await getActiveSessionBrief(session.user.id);

  return (
    <>
      <AmbientBackground />
      <ThemeSync theme={session.user.theme} />
      <EntitlementsProvider value={entitlements}>
        <BodyShell activeSession={active}>
          <div id="main">{children}</div>
        </BodyShell>
      </EntitlementsProvider>
    </>
  );
}
