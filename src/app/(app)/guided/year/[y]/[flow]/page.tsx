import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { MAX_YEARS_AHEAD, MIN_YEAR } from '@/lib/weeks';
import { getYearPageData } from '@/lib/planner/queries';
import { flowFromRoute } from '@/lib/guided/flows';
import { guidedUser } from '@/lib/guided/server';
import { StepIntro } from '@/components/guided/StepIntro';
import { GuidedYearRunner } from '@/components/guided/GuidedRunner';

export async function generateMetadata({ params }: { params: { flow: string } }): Promise<Metadata> {
  const flow = flowFromRoute('year', params.flow);
  if (!flow) return {};
  return { title: (await getTranslations('guided'))(`flows.${flow}.label`) };
}

/** Ano no modo guiado: começa pela palavra do ano; fechar com a reflexão. */
export default async function GuidedYearRoute({ params }: { params: { y: string; flow: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const flow = flowFromRoute('year', params.flow);
  if (!flow) notFound();
  const g = await guidedUser(session.user.id);
  if (!g) redirect('/login');
  if (!/^\d{4}$/.test(params.y)) redirect('/year');
  const year = Number(params.y);
  const current = Number(g.today.slice(0, 4));
  if (year < MIN_YEAR || year > current + MAX_YEARS_AHEAD) redirect('/year');

  const [data, t, prev] = await Promise.all([
    getYearPageData(session.user.id, year, g.user.timezone, g.user.hemisphere),
    getTranslations('guided'),
    db.year.findUnique({ where: { userId_year: { userId: session.user.id, year: year - 1 } }, select: { intention: true, word: true } }),
  ]);
  const earlier = flow === 'YEAR_PLAN' ? (prev?.word?.trim() || prev?.intention?.trim()) : data.plan.intention.trim();
  return (
    <GuidedYearRunner
      flow={flow}
      periodKey={params.y}
      routeBase={`/guided/year/${params.y}`}
      initial={data.plan}
      ctx={g.ctx}
      closeHref={year === current ? '/year' : `/year/${year}`}
      intro={
        <StepIntro
          icon="calendar"
          eyebrow={String(year)}
          title={t(`intro.${flow}.title`)}
          lines={earlier ? [t(flow === 'YEAR_PLAN' ? 'intro.previousIntention' : 'intro.thisIntention', { text: earlier })] : []}
          cta={t(`intro.${flow}.cta`)}
        />
      }
    />
  );
}
