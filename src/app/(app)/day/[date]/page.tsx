import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { compareDates, formatLongDate, isDateISO, todayInTz } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import { DayPage } from '@/components/day/DayPage';
import { Motto } from '@/components/ui/Motto';

interface DayRouteProps {
  params: { date: string };
}

export async function generateMetadata({ params }: DayRouteProps): Promise<Metadata> {
  if (!isDateISO(params.date)) return {};
  const locale = await getLocale();
  return { title: formatLongDate(params.date, isAppLocale(locale) ? locale : 'pt-PT') };
}

/** Dia passado do diário. Data inválida, futura ou hoje → /today. */
export default async function DayRoute({ params }: DayRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  const { date } = params;
  if (!isDateISO(date) || compareDates(date, todayInTz(user.timezone)) >= 0 || compareDates(date, '2000-01-01') < 0) {
    redirect('/today');
  }

  const tc = await getTranslations('common');
  return (
    <>
      <DayPage date={date} />
      <Motto text={tc('motto')} />
    </>
  );
}
