import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { addDays, formatLongDate, isDateISO } from '@/lib/dates';
import { getDailySky } from '@/lib/astro/sky';
import { getDailyEntry } from '@/lib/daily/queries';
import { getDayReading } from '@/lib/ai/queries';
import { isWindowOpen, xpWindow } from '@/lib/xp/rules';
import { flowFromRoute } from '@/lib/guided/flows';
import { guidedUser } from '@/lib/guided/server';
import { isAppLocale } from '@/i18n/locales';
import { DailyReadingCard } from '@/components/reading/DailyReadingCard';
import { RitualTodayCard } from '@/components/reading/RitualTodayCard';
import { StepIntro } from '@/components/guided/StepIntro';
import { GuidedDayRunner } from '@/components/guided/GuidedRunner';

export async function generateMetadata({ params }: { params: { flow: string } }): Promise<Metadata> {
  const flow = flowFromRoute('day', params.flow);
  if (!flow) return {};
  const t = await getTranslations('guided');
  return { title: t(`flows.${flow}.label`) };
}

/** Diário no modo guiado: só hoje e ontem (ontem enquanto a janela do Glow do dia estiver aberta). */
export default async function GuidedDayRoute({ params }: { params: { date: string; flow: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const flow = flowFromRoute('day', params.flow);
  if (!flow) notFound();
  const g = await guidedUser(session.user.id);
  if (!g) redirect('/login');
  const { date } = params;
  const yesterdayOk = isDateISO(date) && date === addDays(g.today, -1) && isWindowOpen(xpWindow('DAY_MORNING', date, g.user.timezone), new Date());
  if (!isDateISO(date) || (date !== g.today && !yesterdayOk)) redirect('/today');

  const [entry, rawLocale, t, ta] = await Promise.all([getDailyEntry(session.user.id, date), getLocale(), getTranslations('guided'), getTranslations('astro')]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const reading = flow === 'DAY_MORNING' ? await getDayReading(session.user.id, date) : null;
  const sky = getDailySky(date, g.user.timezone);
  const moon = `${ta(`phases.${sky.moon.phase}`)} · ${ta(`signs.${sky.moon.signAtNoon}`)}`;
  const intro = {
    DAY_MORNING: { icon: 'sun' as const, title: t('intro.morning.title', { name: g.firstName }), cta: t('intro.morning.cta') },
    DAY_BODY: { icon: 'stretch' as const, title: t('intro.body.title'), cta: t('intro.body.cta') },
    DAY_NIGHT: { icon: 'moon-crescent' as const, title: t('intro.night.title'), cta: t('intro.night.cta') },
  }[flow as 'DAY_MORNING' | 'DAY_BODY' | 'DAY_NIGHT'];

  return (
    <GuidedDayRunner
      flow={flow}
      date={date}
      periodKey={date}
      routeBase={`/guided/day/${date}`}
      initial={entry}
      ctx={g.ctx}
      closeHref={date === g.today ? '/today' : `/day/${date}`}
      intro={<StepIntro icon={intro.icon} eyebrow={formatLongDate(date, locale)} title={intro.title} lines={[moon]} cta={intro.cta} />}
      {...(reading && {
        reading: { node: <DailyReadingCard personal={reading.personal} pending={reading.pending} />, pending: reading.personal.status !== 'ready' },
        ritual: reading.ritualToday ? <RitualTodayCard ritual={reading.ritualToday} locale={locale} /> : undefined,
        // A intenção sugerida pela leitura pessoal do dia aparece ao lado do passo da intenção.
        inspiration: { intention: reading.personal.status === 'ready' ? [reading.personal.data.intentionSuggestion] : [], areas: {} },
      })}
    />
  );
}
