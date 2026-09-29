import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMonthName, type DateISO } from '@/lib/dates';
import { monthKey } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import type { YearMonthSummary } from '@/types/planner';
import { YearMonthTile } from './YearMonthTile';

interface YearGridProps {
  year: number;
  months: YearMonthSummary[];
  today: DateISO;
}

/** Os 12 meses (3×4 / 2×6 / 1 coluna), cada um liga ao planner mensal. */
export async function YearGrid({ year, months, today }: YearGridProps) {
  const [t, rawLocale] = await Promise.all([getTranslations('year.grid'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  return (
    <GlassCard title={t('title')}>
      <ul className="mg-year-grid">
        {months.map((m) => (
          <li key={m.month}>
            <YearMonthTile
              year={year}
              summary={m}
              name={formatMonthName(year, m.month, locale)}
              today={today}
              href={m.isCurrent ? '/month' : `/month/${monthKey(year, m.month)}`}
            />
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
