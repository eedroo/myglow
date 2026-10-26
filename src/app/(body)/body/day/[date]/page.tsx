import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { compareDates, isDateISO, todayInTz } from '@/lib/dates';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { getDayData, trainedDates } from '@/lib/body/queries';
import { BodyDayView } from '@/components/body/BodyDayView';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.day');
  return { title: t('title') };
}

/** Tab Dia: um dia passado (hoje redirecciona para /body/day; futuro → 404). */
export default async function DayDateRoute({ params }: { params: { date: string } }) {
  const { userId, locale } = await bodyPage();
  if (!isDateISO(params.date)) notFound();
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const today = todayInTz(user?.timezone ?? 'UTC');
  if (params.date === today) redirect('/body/day');
  if (compareDates(params.date, today) > 0 || params.date < '2000-01-01') notFound();
  const [data, trained] = await Promise.all([getDayData(userId, params.date, locale), trainedDates(userId)]);
  return <BodyDayView data={data} trained={trained} />;
}
