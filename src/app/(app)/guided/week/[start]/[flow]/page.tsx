import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, compareDates, formatDateRange, isDateISO, toDbDate } from '@/lib/dates';
import { MAX_WEEKS_AHEAD, isSunday, weekStartOf, weeksBetween } from '@/lib/weeks';
import { getWeekPageData } from '@/lib/week/queries';
import { flowFromRoute } from '@/lib/guided/flows';
import { guidedUser } from '@/lib/guided/server';
import { isAppLocale } from '@/i18n/locales';
import { StepIntro } from '@/components/guided/StepIntro';
import { GuidedWeekRunner } from '@/components/guided/GuidedRunner';
import { periodGuidance } from '@/components/guided/GuidedPeriodReading';

export async function generateMetadata({ params }: { params: { flow: string } }): Promise<Metadata> {
  const flow = flowFromRoute('week', params.flow);
  if (!flow) return {};
  return { title: (await getTranslations('guided'))(`flows.${flow}.label`) };
}

/** Semana no modo guiado: planear ou fechar (mesmos limites que a vista normal). */
export default async function GuidedWeekRoute({ params }: { params: { start: string; flow: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const flow = flowFromRoute('week', params.flow);
  if (!flow) notFound();
  const g = await guidedUser(session.user.id);
  if (!g) redirect('/login');
  const { start } = params;
  const current = weekStartOf(g.today);
  if (!isDateISO(start) || !isSunday(start) || compareDates(start, '2000-01-01') < 0 || weeksBetween(current, start) > MAX_WEEKS_AHEAD) redirect('/week');

  const [data, rawLocale, t, prev] = await Promise.all([
    getWeekPageData(session.user.id, start, g.user.timezone),
    getLocale(),
    getTranslations('guided'),
    db.week.findUnique({ where: { userId_startDate: { userId: session.user.id, startDate: toDbDate(addDays(start, -7)) } }, select: { intention: true } }),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const earlier = flow === 'WEEK_PLAN' ? prev?.intention?.trim() : data.week.intention.trim();
  const guidance =
    flow === 'WEEK_PLAN'
      ? await periodGuidance({ userId: session.user.id, kind: 'WEEK', from: start, to: addDays(start, 6), tz: g.user.timezone, hemisphere: g.user.hemisphere, locale })
      : null;
  return (
    <GuidedWeekRunner
      flow={flow}
      periodKey={start}
      routeBase={`/guided/week/${start}`}
      initial={data.week}
      ctx={g.ctx}
      weightAverage={data.dailyWeight}
      {...(guidance && { reading: guidance.reading, inspiration: guidance.inspiration })}
      closeHref={start === current ? '/week' : `/week/${start}`}
      intro={
        <StepIntro
          icon="calendar"
          eyebrow={formatDateRange(start, addDays(start, 6), locale)}
          title={t(`intro.${flow}.title`)}
          lines={earlier ? [t(flow === 'WEEK_PLAN' ? 'intro.previousIntention' : 'intro.thisIntention', { text: earlier })] : []}
          cta={t(`intro.${flow}.cta`)}
        />
      }
    />
  );
}
