import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { DayProgressDots } from '@/components/ui/DayProgressDots';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MOON_PHASE_ICON } from '@/components/ui/MoonPhaseStrip';
import { formatLongDate, formatWeekdayShort, type DateISO } from '@/lib/dates';
import { weekDays, weekKey, weekStartOf } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import type { MonthOverview } from '@/lib/month/overview';

interface MonthCalendarProps {
  overview: Pick<MonthOverview, 'grid' | 'days' | 'today'>;
  /** Domingo da semana actual (para ligar a /week em vez de /week/<data>). */
  currentWeekStart: DateISO;
}

/** Grelha domingo → sábado com número, lua e progresso de cada dia. */
export async function MonthCalendar({ overview, currentWeekStart }: MonthCalendarProps) {
  const [t, ta, tw, rawLocale] = await Promise.all([
    getTranslations('month.calendar'),
    getTranslations('astro'),
    getTranslations('week'),
    getLocale(),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const firstDate = overview.grid.flat().find(Boolean)!;
  const headers = weekDays(weekStartOf(firstDate)).map((d) => formatWeekdayShort(d, locale));

  return (
    <GlassCard title={t('title')}>
      <div className="mg-calendar" role="grid" aria-label={t('title')}>
        <div className="mg-calendar__head" role="row">
          <span aria-hidden="true" />
          {headers.map((h) => (
            <span key={h} role="columnheader">
              {h}
            </span>
          ))}
        </div>
        {overview.grid.map((row) => {
          const sunday = weekStartOf(row.find(Boolean)!);
          const n = weekKey(sunday).weekOfMonth;
          return (
            <div key={sunday} className="mg-calendar__row" role="row">
              <Link
                href={sunday === currentWeekStart ? '/week' : `/week/${sunday}`}
                className="mg-calendar__week"
                aria-label={t('weekLink', { n })}
                title={t('weekLink', { n })}
              >
                <MagicIcon name="calendar" size="sm" decorative />
              </Link>
              {row.map((date, i) => {
                if (!date) return <span key={i} className="mg-calendar__cell mg-calendar__cell--out" role="gridcell" />;
                const day = overview.days[date]!;
                const classes = [
                  'mg-calendar__cell',
                  `mg-calendar__cell--${day.progress.level}`,
                  day.isToday && 'mg-calendar__cell--today',
                  day.isFuture && 'mg-calendar__cell--future',
                ]
                  .filter(Boolean)
                  .join(' ');
                const status = tw('progress', {
                  morning: day.progress.morning ? 'yes' : 'no',
                  bodyChecks: day.progress.bodyChecks,
                  night: day.progress.night ? 'yes' : 'no',
                });
                const content = (
                  <>
                    <span className="mg-calendar__num">{Number(date.slice(8))}</span>
                    <span className="mg-calendar__moon">
                      <MagicIcon name={MOON_PHASE_ICON[day.moon.phase]} size="sm" label={ta(`phases.${day.moon.phase}`)} />
                    </span>
                    {!day.isFuture && <DayProgressDots progress={day.progress} label={status} size="sm" />}
                  </>
                );
                return day.isFuture ? (
                  <span key={date} className={classes} role="gridcell">
                    {content}
                  </span>
                ) : (
                  <Link
                    key={date}
                    href={day.isToday ? '/today' : `/day/${date}`}
                    className={classes}
                    role="gridcell"
                    aria-label={`${t('openDay', { date: formatLongDate(date, locale) })} — ${status}`}
                    aria-current={day.isToday ? 'date' : undefined}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
