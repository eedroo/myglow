import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { formatMonthYear, todayInTz } from '@/lib/dates';
import { MAX_MONTHS_AHEAD, addMonths, isMonthKey, monthKey, monthOf, parseMonthKey } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import { MonthOverviewPage } from '@/components/month/MonthOverviewPage';

interface MonthRouteProps {
  params: { ym: string };
}

export async function generateMetadata({ params }: MonthRouteProps): Promise<Metadata> {
  if (!isMonthKey(params.ym)) return {};
  const { year, month } = parseMonthKey(params.ym);
  const locale = await getLocale();
  return { title: formatMonthYear(year, month, isAppLocale(locale) ? locale : 'pt-PT') };
}

/** Mês 'YYYY-MM': passado desde 2000 e futuro até 12 meses; o mês actual vive em /month. */
export default async function MonthRoute({ params }: MonthRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  if (!isMonthKey(params.ym)) redirect('/month');
  const { year, month } = parseMonthKey(params.ym);
  const current = monthOf(todayInTz(user.timezone));
  const limit = addMonths(current.year, current.month, MAX_MONTHS_AHEAD);
  const key = monthKey(year, month);
  if (year < 2000 || key > monthKey(limit.year, limit.month) || key === monthKey(current.year, current.month)) {
    redirect('/month');
  }

  return <MonthOverviewPage year={year} month={month} />;
}
