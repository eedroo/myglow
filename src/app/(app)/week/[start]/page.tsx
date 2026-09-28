import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, compareDates, formatDateRange, isDateISO, todayInTz } from '@/lib/dates';
import { MAX_WEEKS_AHEAD, isSunday, weekStartOf, weeksBetween } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import { WeekPage } from '@/components/week/WeekPage';

interface WeekRouteProps {
  params: { start: string };
}

export async function generateMetadata({ params }: WeekRouteProps): Promise<Metadata> {
  if (!isDateISO(params.start) || !isSunday(params.start)) return {};
  const locale = await getLocale();
  return { title: formatDateRange(params.start, addDays(params.start, 6), isAppLocale(locale) ? locale : 'pt-PT') };
}

/** Semana a partir de um domingo. Data inválida ou fora dos limites → /week; não-domingo → o seu domingo. */
export default async function WeekRoute({ params }: WeekRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  const { start } = params;
  if (!isDateISO(start)) redirect('/week');
  if (!isSunday(start)) redirect(`/week/${weekStartOf(start)}`);

  const current = weekStartOf(todayInTz(user.timezone));
  if (compareDates(start, '2000-01-01') < 0 || weeksBetween(current, start) > MAX_WEEKS_AHEAD) redirect('/week');
  if (start === current) redirect('/week');

  return <WeekPage start={start} />;
}
