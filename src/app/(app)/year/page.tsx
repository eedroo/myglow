import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { YearPlannerPage } from '@/components/year/YearPlannerPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.year');
  return { title: t('title') };
}

export default async function CurrentYearRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  return <YearPlannerPage year={Number(todayInTz(user.timezone).slice(0, 4))} />;
}
