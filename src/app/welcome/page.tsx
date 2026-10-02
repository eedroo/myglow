import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { WelcomeTour } from '@/components/welcome/WelcomeTour';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('welcome');
  return { title: t('label') };
}

/** Apresentação (F10): depois do nascimento; também pode ser revista mais tarde (perfil, primeiros passos). */
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect('/api/session/end');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { onboardedAt: true } });
  if (!user) redirect('/api/session/end');
  if (!user.onboardedAt) redirect('/onboarding');
  return (
    <>
      <AmbientBackground />
      <main id="main">
        <WelcomeTour />
      </main>
    </>
  );
}
