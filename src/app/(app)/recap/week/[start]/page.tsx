import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { isDateISO } from '@/lib/dates';
import { isSunday } from '@/lib/weeks';
import { buildRecap } from '@/lib/recap/build';
import { weekRecapPeriod } from '@/lib/recap/period';
import { getRecapInput, recapGuideInterested, recapRouteAllowed } from '@/lib/recap/server';
import { RecapPlayer } from '@/components/recap/RecapPlayer';

interface RecapWeekRouteProps {
  params: { start: string };
  searchParams: { auto?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('recap');
  return { title: t('meta.week') };
}

/** Retrospectiva de uma semana acabada (domingo → sábado). */
export default async function RecapWeekRoute({ params, searchParams }: RecapWeekRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { start } = params;
  if (!isDateISO(start) || !isSunday(start)) redirect('/week');

  const period = weekRecapPeriod(start);
  if (!(await recapRouteAllowed(session.user.id, period))) redirect('/week');

  const [input, guideInterested] = await Promise.all([
    getRecapInput(session.user.id, period),
    recapGuideInterested(session.user.id),
  ]);
  const auto = searchParams.auto === '1';

  return (
    <RecapPlayer
      kind="WEEK"
      periodKey={period.key}
      slides={buildRecap(input)}
      locale={input.locale}
      timezone={input.tz}
      guideInterested={guideInterested}
      closeHref={auto ? '/today' : `/week/${start}`}
    />
  );
}
