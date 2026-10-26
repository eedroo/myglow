import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { formatMonthYear } from '@/lib/dates';
import { MAX_MONTHS_AHEAD, addMonths, isMonthKey, monthKey, monthOf, parseMonthKey } from '@/lib/weeks';
import { getMonthPageData } from '@/lib/planner/queries';
import { flowFromRoute } from '@/lib/guided/flows';
import { guidedUser } from '@/lib/guided/server';
import { isAppLocale } from '@/i18n/locales';
import { StepIntro } from '@/components/guided/StepIntro';
import { GuidedMonthRunner } from '@/components/guided/GuidedRunner';

export async function generateMetadata({ params }: { params: { flow: string } }): Promise<Metadata> {
  const flow = flowFromRoute('month', params.flow);
  if (!flow) return {};
  return { title: (await getTranslations('guided'))(`flows.${flow}.label`) };
}

/** Mês no modo guiado: planear ou fechar. */
export default async function GuidedMonthRoute({ params }: { params: { ym: string; flow: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const flow = flowFromRoute('month', params.flow);
  if (!flow) notFound();
  const g = await guidedUser(session.user.id);
  if (!g) redirect('/login');
  if (!isMonthKey(params.ym)) redirect('/month');
  const { year, month } = parseMonthKey(params.ym);
  const current = monthOf(g.today);
  const limit = addMonths(current.year, current.month, MAX_MONTHS_AHEAD);
  if (year < 2000 || params.ym > monthKey(limit.year, limit.month)) redirect('/month');

  const prevKey = addMonths(year, month, -1);
  const [data, rawLocale, t, prev] = await Promise.all([
    getMonthPageData(session.user.id, year, month, g.user.timezone, g.user.hemisphere),
    getLocale(),
    getTranslations('guided'),
    db.month.findUnique({ where: { userId_year_month: { userId: session.user.id, year: prevKey.year, month: prevKey.month } }, select: { intention: true } }),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const earlier = flow === 'MONTH_PLAN' ? prev?.intention?.trim() : data.plan.intention.trim();
  const isCurrent = params.ym === monthKey(current.year, current.month);
  return (
    <GuidedMonthRunner
      flow={flow}
      periodKey={params.ym}
      routeBase={`/guided/month/${params.ym}`}
      initial={data.plan}
      ctx={g.ctx}
      closeHref={isCurrent ? '/month' : `/month/${params.ym}`}
      intro={
        <StepIntro
          icon="calendar"
          eyebrow={formatMonthYear(year, month, locale)}
          title={t(`intro.${flow}.title`)}
          lines={earlier ? [t(flow === 'MONTH_PLAN' ? 'intro.previousIntention' : 'intro.thisIntention', { text: earlier })] : []}
          cta={t(`intro.${flow}.cta`)}
        />
      }
    />
  );
}
