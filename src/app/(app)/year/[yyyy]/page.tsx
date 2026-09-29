import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { MAX_YEARS_AHEAD, MIN_YEAR } from '@/lib/weeks';
import { YearPlannerPage } from '@/components/year/YearPlannerPage';

interface YearRouteProps {
  params: { yyyy: string };
}

export function generateMetadata({ params }: YearRouteProps): Metadata {
  return /^\d{4}$/.test(params.yyyy) ? { title: params.yyyy } : {};
}

/** Ano 'AAAA' entre 2000 e o próximo; o ano actual vive em /year. */
export default async function YearRoute({ params }: YearRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  if (!/^\d{4}$/.test(params.yyyy)) redirect('/year');
  const year = Number(params.yyyy);
  const current = Number(todayInTz(user.timezone).slice(0, 4));
  if (year < MIN_YEAR || year > current + MAX_YEARS_AHEAD || year === current) redirect('/year');

  return <YearPlannerPage year={year} />;
}
