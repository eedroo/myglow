import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { compareDates, type DateISO } from '@/lib/dates';
import { monthGrid, monthKey } from '@/lib/weeks';
import type { YearMonthSummary } from '@/types/planner';

interface YearMonthTileProps {
  year: number;
  summary: YearMonthSummary;
  name: string; // "Maio"
  today: DateISO;
  href: string;
}

/** Um mês na grelha anual: intenção, mini-calendário de pontos e dias completos. */
export async function YearMonthTile({ year, summary, name, today, href }: YearMonthTileProps) {
  const t = await getTranslations('year.grid');
  const days = monthGrid(year, summary.month).flat();
  const firstLine = summary.intention.split('\n').find((l) => l.trim() !== '') ?? '';
  const classes = [
    'mg-year-month',
    summary.isCurrent && 'mg-year-month--current',
    summary.isFuture && 'mg-year-month--future',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link href={href} className={classes} aria-label={t('openMonth', { month: name })} data-month={monthKey(year, summary.month)}>
      <span className="mg-year-month__name">{name}</span>
      <span className="mg-year-month__intention">{firstLine}</span>
      <span className="mg-year-month__mini" aria-hidden="true">
        {days.map((d, i) => {
          if (!d) return <span key={i} className="mg-year-month__dot mg-year-month__dot--out" />;
          const level = summary.levels[d] ?? 'empty';
          const future = compareDates(d, today) > 0;
          return (
            <span
              key={d}
              className={`mg-year-month__dot mg-year-month__dot--${future ? 'future' : level}`}
            />
          );
        })}
      </span>
      {!summary.isFuture && (
        <span className="mg-year-month__count">
          {t('complete', { complete: summary.stats.daysComplete, total: summary.stats.daysElapsed })}
        </span>
      )}
    </Link>
  );
}
