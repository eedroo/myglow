import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { requireFeature } from '@/lib/entitlements/server';
import { isEnded, recapPeriod, type RecapPeriod } from '@/lib/recap/period';
import { GuidePage } from '@/components/guide/GuidePage';

interface GuideRouteProps {
  params: { kind: string; key: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('guide');
  return { title: t('name') };
}

/** Leitura do Guia de uma semana ('YYYY-MM-DD', domingo) ou de um mês ('YYYY-MM') acabados. Sem acesso → 404. */
export default async function GuideRoute({ params }: GuideRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  await requireFeature(session.user.id, 'guide');

  const kind = params.kind === 'week' ? 'WEEK' : params.kind === 'month' ? 'MONTH' : null;
  if (!kind) notFound();
  let period: RecapPeriod;
  try {
    period = recapPeriod(kind, params.key);
  } catch {
    notFound();
  }
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');
  if (!isEnded(period, todayInTz(user.timezone))) redirect(kind === 'WEEK' ? '/week' : '/month');

  return <GuidePage userId={session.user.id} period={period} timezone={user.timezone} />;
}
