import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';
import { WeekPage } from '@/components/week/WeekPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.week');
  return { title: t('title') };
}

export default async function CurrentWeekRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  // Semana actual no fuso do utilizador (domingo → sábado).
  return <WeekPage start={weekStartOf(todayInTz(user.timezone))} />;
}
