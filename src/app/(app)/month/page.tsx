import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { monthOf } from '@/lib/weeks';
import { MonthOverviewPage } from '@/components/month/MonthOverviewPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.month');
  return { title: t('title') };
}

export default async function CurrentMonthRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  const { year, month } = monthOf(todayInTz(user.timezone));
  return <MonthOverviewPage year={year} month={month} />;
}
