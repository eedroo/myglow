import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { isMonthKey } from '@/lib/weeks';
import { buildRecap } from '@/lib/recap/build';
import { monthRecapPeriod } from '@/lib/recap/period';
import { getRecapInput, recapGuideInterested, recapRouteAllowed } from '@/lib/recap/server';
import { RecapPlayer } from '@/components/recap/RecapPlayer';

interface RecapMonthRouteProps {
  params: { ym: string };
  searchParams: { auto?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('recap');
  return { title: t('meta.month') };
}

/** Retrospectiva de um mês acabado ('YYYY-MM'). */
export default async function RecapMonthRoute({ params, searchParams }: RecapMonthRouteProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!isMonthKey(params.ym)) redirect('/month');

  const period = monthRecapPeriod(params.ym);
  if (!(await recapRouteAllowed(session.user.id, period))) redirect('/month');

  const [input, guideInterested] = await Promise.all([
    getRecapInput(session.user.id, period),
    recapGuideInterested(session.user.id),
  ]);
  const auto = searchParams.auto === '1';

  return (
    <RecapPlayer
      kind="MONTH"
      periodKey={period.key}
      slides={buildRecap(input)}
      locale={input.locale}
      timezone={input.tz}
      guideInterested={guideInterested}
      closeHref={auto ? '/today' : `/month/${params.ym}`}
    />
  );
}
