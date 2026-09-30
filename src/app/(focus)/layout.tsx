import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { GlowProvider } from '@/components/glow/GlowProvider';
import { levelFor } from '@/lib/xp/levels';

/** Rotas em ecrã inteiro (leitor de lições e quiz do Grimório): sem TopBar nem BottomNav. */
export default async function FocusLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.onboarded) redirect('/onboarding');
  const glow = await db.user.findUnique({ where: { id: session.user.id }, select: { xpTotal: true, levelSeen: true } });

  return (
    <>
      <AmbientBackground />
      <ThemeSync theme={session.user.theme} />
      <GlowProvider level={levelFor(glow?.xpTotal ?? 0).level} levelSeen={glow?.levelSeen ?? 1}>
        <main id="main" className="mg-focus">
          {children}
        </main>
      </GlowProvider>
    </>
  );
}
