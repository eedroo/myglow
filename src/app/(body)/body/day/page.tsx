import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { todayInTz } from '@/lib/dates';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { getDayData, trainedDates } from '@/lib/body/queries';
import { BodyDayView } from '@/components/body/BodyDayView';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.day');
  return { title: t('title') };
}

/** Tab Dia: hoje. */
export default async function DayRoute() {
  const { userId, locale } = await bodyPage();
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const today = todayInTz(user?.timezone ?? 'UTC');
  const [data, trained] = await Promise.all([getDayData(userId, today, locale), trainedDates(userId)]);
  return <BodyDayView data={data} trained={trained} />;
}
