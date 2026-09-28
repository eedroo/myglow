import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { DayPage } from '@/components/day/DayPage';
import { Motto } from '@/components/ui/Motto';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.today');
  return { title: t('title') };
}

export default async function TodayPage() {
  const [tc, session] = await Promise.all([getTranslations('common'), auth()]);
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  // O "hoje" do diário é o dia no fuso IANA do utilizador.
  const today = todayInTz(user.timezone);

  return (
    <>
      <DayPage date={today} />
      <Motto text={tc('motto')} />
    </>
  );
}
