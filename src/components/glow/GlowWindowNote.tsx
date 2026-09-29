import type { XpSource } from '@prisma/client';
import { getLocale, getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDayMonth, formatWeekdayShort, type DateISO } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import { DAY_MAX_POINTS, DAY_SOURCES, XP_POINTS, type WindowedSource } from '@/lib/xp/rules';
import { windowState, type WindowPhase } from '@/lib/xp/window';

type Period = 'day' | 'week' | 'month' | 'year';

const PLAN: Record<Exclude<Period, 'day'>, WindowedSource> = { week: 'WEEK_PLAN', month: 'MONTH_PLAN', year: 'YEAR_PLAN' };
const REFLECTION: Record<Exclude<Period, 'day'>, WindowedSource> = {
  week: 'WEEK_REFLECTION',
  month: 'MONTH_REFLECTION',
  year: 'YEAR_REFLECTION',
};

interface GlowWindowNoteProps {
  period: Period;
  periodStart: DateISO; // dia, domingo, dia 1 do mês ou 1 de janeiro
  timezone: string;
  today: DateISO;
  /** Fontes já ganhas para este período (de `getPeriodAwards`). */
  earned: XpSource[];
  /** Para testes e showcase. */
  now?: Date;
}

/** Nota discreta sobre quando o Glow deste período conta (e se já foi ganho). */
export async function GlowWindowNote({ period, periodStart, timezone, today, earned, now = new Date() }: GlowWindowNoteProps) {
  const [t, rawLocale] = await Promise.all([getTranslations('glow'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const when = (d: DateISO) => `${formatWeekdayShort(d, locale)}, ${formatDayMonth(d, locale)}`;

  const items: { key: string; phase: WindowPhase; text: string }[] = [];

  if (period === 'day') {
    const earnedPoints = earned
      .filter((s) => (DAY_SOURCES as readonly XpSource[]).includes(s))
      .reduce((sum, s) => sum + XP_POINTS[s], 0);
    const state = windowState('DAY_MORNING', periodStart, timezone, now, []);
    const values = { earned: earnedPoints, possible: DAY_MAX_POINTS };
    if (earnedPoints === DAY_MAX_POINTS) items.push({ key: 'day', phase: 'earned', text: t('window.dayEarned', values) });
    else if (state.phase === 'open' && periodStart === today) items.push({ key: 'day', phase: 'open', text: t('window.dayToday', values) });
    else if (state.phase === 'open') items.push({ key: 'day', phase: 'open', text: t('window.dayOpen', values) });
    else items.push({ key: 'day', phase: 'closed', text: t('window.dayClosed') });
  } else {
    for (const [kind, source] of [['plan', PLAN[period]], ['reflection', REFLECTION[period]]] as const) {
      const s = windowState(source, periodStart, timezone, now, earned);
      const label = t(`sources.${source}`);
      const text =
        s.phase === 'earned'
          ? t('window.earned', { label, points: s.points })
          : s.phase === 'closed'
            ? t('window.closed', { label })
            : s.phase === 'open'
              ? t(kind === 'plan' ? 'window.planOpen' : 'window.reflectionOpen', { until: when(s.until), points: s.points })
              : t(kind === 'plan' ? 'window.planUpcoming' : 'window.reflectionUpcoming', { from: when(s.from), points: s.points });
      items.push({ key: source, phase: s.phase, text });
    }
  }

  return (
    <ul className="mg-glow-note" aria-label={t('name')}>
      {items.map((i) => (
        <li key={i.key} className={`mg-glow-note__item mg-glow-note__item--${i.phase}`}>
          <MagicIcon name="glow-orb" size="sm" decorative />
          {i.text}
        </li>
      ))}
    </ul>
  );
}
