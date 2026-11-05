import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getOculto } from '@/lib/oculto/server';
import { OcultoHome } from '@/components/oculto/OcultoHome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('oculto');
  return { title: t('doorTitle'), robots: { index: false } };
}

/** Grimório Oculto: só com o recurso 'oculto' (para os outros não existe). */
export default async function OcultoRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const state = await getOculto(session.user.id);
  if (!state) notFound();
  return <OcultoHome state={state} />;
}
