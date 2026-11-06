import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getOculto } from '@/lib/oculto/server';
import { ownOrb } from '@/lib/friends/queries';
import { OcultoSessionPlayer } from '@/components/oculto/OcultoSessionPlayer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('oculto');
  return { title: t('doorTitle'), robots: { index: false } };
}

/** A próxima sessão da semana (uma por dia); sem sessão por fazer hoje, volta ao Grimório Oculto. */
export default async function OcultoSessionRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const state = await getOculto(session.user.id);
  if (!state) notFound();
  const def = state.content?.sessions.find((s) => s.day === state.status.next);
  if (!state.content || !def || !state.status.canPractice || state.currentReview?.result === 'ADVANCE') redirect('/oculto');
  const orb = await ownOrb(session.user.id).catch(() => null);
  return (
    <OcultoSessionPlayer
      week={state.week}
      weekTitle={state.content.title}
      session={def}
      howTo={state.content.howTo}
      orb={orb}
      dreamJournal={!!state.content.dreamJournal}
      initialDream={state.todayDream}
      operationsJournal={!!state.content.operationsJournal}
      sigilHelper={!!state.content.sigilHelper}
    />
  );
}
